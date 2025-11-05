# --- Python Standard Library Imports ---
import base64
import os
import io
from datetime import datetime

# --- Third-Party Library Imports ---
import numpy as np
import cv2
import requests
import cloudinary
import cloudinary.uploader
from pymongo import MongoClient
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, File, Form
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO

# --- 1. Load All API Keys and Configs ---

# Load all variables from the .env file into the environment
load_dotenv()

# Load API keys from the environment
GEOAPIFY_API_KEY = os.getenv("GEOAPIFY_API_KEY")

# Configure Cloudinary SDK
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET")
)

# Configure MongoDB connection
ATLAS_URI = os.getenv("ATLAS_URI")
DB_NAME = os.getenv("DB_NAME")
try:
    mongo_client = MongoClient(ATLAS_URI)
    db = mongo_client[DB_NAME]
    problems_collection = db.problems  # This is our collection
    print("MongoDB connected successfully!")
except Exception as e:
    print(f"Error connecting to MongoDB: {e}")
    mongo_client = None

# --- 2. Pydantic Models ---
# These models define the expected JSON data for our API.
# FastAPI uses them for automatic request validation.

class BoundingBox(BaseModel):
    """Defines the structure for a single bounding box."""
    x_min: float
    y_min: float
    x_max: float
    y_max: float
    confidence: float
    class_name: str

class ImagePayload(BaseModel):
    """Data model for the /vision/detect endpoint."""
    image: str
    latitude: float
    longitude: float

class DetectionResult(BaseModel):
    """Data model for the /vision/detect response."""
    status: str
    pothole_detected: bool
    latitude: float
    longitude: float
    message: str
    detections: list[BoundingBox]

class FinalReportPayload(BaseModel):
    """Data model for the final /report/submit endpoint."""
    image: str
    location: dict
    detections: list[BoundingBox]


# --- 3. Computer Vision Inference Service ---
class CVInferenceService:
    """A class to wrap all YOLO model logic."""
    def __init__(self):
        """Constructor: Loads the YOLO model into memory on startup."""
        self.MODEL_PATH = os.path.join("model", "best.pt")
        try:
            # IMPORTANT: This loads your trained .pt file
            self.model = YOLO(self.MODEL_PATH)
            self.TARGET_CLASS_NAME = 'pothole'
            self.CONFIDENCE_THRESHOLD = 0.25
            self.IOU_THRESHOLD = 0.5
            print(f"INFO: YOLO model loaded successfully from {self.MODEL_PATH}.")
        except Exception as e:
            print(f"FATAL ERROR: Could not load YOLO model.")
            print(f"DETAILS: {e}")
            self.model = None

    def decode_base64_image(self, base64_string: str) -> np.ndarray:
        """Converts a base64 image string into an OpenCV (numpy) image."""
        if ',' in base64_string:
            base64_string = base64_string.split(',')[1]
        try:
            image_bytes = base64.b64decode(base64_string)
            np_array = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(np_array, cv2.IMREAD_COLOR)
            if img is None:
                raise ValueError("cv2.imdecode failed.")
            return img
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid image format: {e}")

    def run_inference(self, image: np.ndarray) -> list[BoundingBox]:
        """Runs the loaded YOLO model on the provided image."""
        if not self.model:
            return []
        
        # IMPORTANT: This is where the AI model runs the detection
        results = self.model.predict(
            source=image,
            conf=self.CONFIDENCE_THRESHOLD,
            iou=self.IOU_THRESHOLD,
            verbose=False,
            imgsz=640
        )
        
        detected_potholes: list[BoundingBox] = []
        if results and len(results) > 0:
            result = results[0]
            for box in result.boxes:
                class_index = int(box.cls[0])
                class_name = result.names[class_index]
                confidence = float(box.conf[0])
                
                # We only save detections that match our target class
                if class_name.lower() == self.TARGET_CLASS_NAME:
                    coords = box.xyxy[0].tolist()
                    detected_potholes.append(
                        BoundingBox(
                            x_min=round(coords[0]),
                            y_min=round(coords[1]),
                            x_max=round(coords[2]),
                            y_max=round(coords[3]),
                            confidence=round(confidence, 4),
                            class_name=class_name
                        )
                    )
        return detected_potholes

# --- 4. Helper Function for Geocoding ---
def get_ward_from_coords(lat: float, lon: float):
    """Uses Geoapify to convert (lat, lon) into a ward name and full address."""
    url = f"https://api.geoapify.com/v1/geocode/reverse?lat={lat}&lon={lon}&apiKey={GEOAPIFY_API_KEY}"
    try:
        response = requests.get(url)
        data = response.json()
        properties = data['features'][0]['properties']
        
        # IMPORTANT: This logic determines the ward name.
        # We try 'suburb' first, then 'district'. You may need to adjust this.
        ward_name = properties.get('suburb', properties.get('district', 'N/A'))
        full_address = properties.get('formatted', 'N/A')
        return ward_name, full_address
    except Exception as e:
        print(f"Geocoding error: {e}")
        return "N/A", "N/A"


# --- 5. FastAPI Application Setup ---
app = FastAPI()
cv_service = CVInferenceService() # Create one instance of the AI model

# IMPORTANT: This configures CORS to allow your React app
# (running on localhost:5173) to communicate with this server.
origins = [
    "http://localhost:5174",
    "http://127.0.0.1:5174",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 6. API Endpoints ---

@app.get("/")
def read_root():
    """Root endpoint to check if the API is running."""
    return {"message": "Civic Problem Detection API is running"}


@app.post("/vision/detect", response_model=DetectionResult)
async def detect_pothole(payload: ImagePayload):
    """
    (Step 1) Receives an image, runs AI detection, and returns bounding boxes.
    This does NOT save to the database.
    """
    image = cv_service.decode_base64_image(payload.image)
    detections = cv_service.run_inference(image)
    pothole_detected = len(detections) > 0

    if pothole_detected:
        message = f"Potholes detected ({len(detections)} instances)."
    else:
        message = "No potholes detected above the confidence threshold."

    return DetectionResult(
        status="success",
        pothole_detected=pothole_detected,
        latitude=payload.latitude,
        longitude=payload.longitude,
        message=message,
        detections=detections
    )


@app.post("/report/submit")
async def submit_report(payload: FinalReportPayload):
    """
    (Step 2) Receives the confirmed report, uploads image, gets ward name,
    and saves the complete report to MongoDB.
    """
    if not mongo_client:
        raise HTTPException(status_code=500, detail="Database not connected")

    lat = payload.location.get('lat')
    lon = payload.location.get('lng')

    # 1. Get Ward Name from Geoapify
    ward_name, full_address = get_ward_from_coords(lat, lon)

    # 2. Upload Image to Cloudinary
    try:
        upload_result = cloudinary.uploader.upload(
            payload.image,
            folder="pothole_reports" # Saves to a specific folder
        )
        image_url = upload_result.get("secure_url") # Get the 'https://' URL
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image upload error: {str(e)}")

    # 3. Save the final report to MongoDB
    try:
        # This is the JSON document structure that will be saved
        report_document = {
            "problem_type": "pothole",
            "location": {
                "type": "Point",
                "coordinates": [lon, lat]  # GeoJSON format (Lon, Lat)
            },
            "ward_name": ward_name,
            "full_address": full_address,
            "image_url": image_url,
            "detections": [d.dict() for d in payload.detections],
            "status": "new",
            "created_at": datetime.utcnow()
        }
        
        # Insert the document into the 'problems' collection
        insert_result = problems_collection.insert_one(report_document)
        
        # 4. Send a success response back to the React app
        return {
            "message": "Report submitted successfully!",
            "report_id": str(insert_result.inserted_id),
            "ward_name": ward_name  # Send the ward name back!
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")