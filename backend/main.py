# --- Python Standard Library Imports ---
import base64
import os
import io
from datetime import datetime

# --- Third-Party Library Imports ---
import numpy as np
import cv2
import httpx
import cloudinary
import cloudinary.uploader
from pymongo import MongoClient
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, File, Form
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from fastapi.concurrency import run_in_threadpool
from ultralytics import YOLO

# --- API Keys and Configs ---
load_dotenv()

GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET")
)

ATLAS_URI = os.getenv("ATLAS_URI")
DB_NAME = os.getenv("DB_NAME")
try:
    mongo_client = MongoClient(ATLAS_URI)
    db = mongo_client[DB_NAME]
    problems_collection = db.problems
    print("MongoDB connected successfully!")
except Exception as e:
    print(f"Error connecting to MongoDB: {e}")
    mongo_client = None

# --- Pydantic Models ---
class BoundingBox(BaseModel):
    x_min: float
    y_min: float
    x_max: float
    y_max: float
    confidence: float
    class_name: str

class ImagePayload(BaseModel):
    image: str
    latitude: float
    longitude: float

class DetectionResult(BaseModel):
    status: str
    pothole_detected: bool
    latitude: float
    longitude: float
    message: str
    detections: list[BoundingBox]

class FinalReportPayload(BaseModel):
    image: str
    location: dict
    detections: list[BoundingBox]


# ---  Computer Vision Inference Service ---
class CVInferenceService:
    def __init__(self):
        self.MODEL_PATH = os.path.join("model", "best.pt")
        self.TARGET_CLASS_NAME = 'pothole'
        self.CONFIDENCE_THRESHOLD = 0.25
        self.IOU_THRESHOLD = 0.5
        # Model is loaded in run_inference() for thread-safety.
        print(f"CVInferenceService initialized. Model path: {self.MODEL_PATH}")
        if not os.path.exists(self.MODEL_PATH):
             print(f"FATAL ERROR: Could not find YOLO model at {self.MODEL_PATH}")

    def decode_base64_image(self, base64_string: str) -> np.ndarray:
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
        # Load the model here (not in __init__) to ensure thread-safety
        # when run_in_threadpool calls this method.
        try:
            model = YOLO(self.MODEL_PATH)
            print(f"INFO: YOLO model loaded successfully from {self.MODEL_PATH} in worker thread.")
        except Exception as e:
            print(f"FATAL ERROR: Could not load YOLO model in worker thread. DETAILS: {e}")
            return []

        results = model.predict(
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

# --- Helper Function for Geocoding ---
async def get_ward_from_coords(lat: float, lon: float):
    """Uses Google Maps API to convert (lat, lon) into a ward/district."""

    base_url = "https://maps.googleapis.com/maps/api/geocode/json"
    params = {
        "latlng": f"{lat},{lon}",
        "key": GOOGLE_MAPS_API_KEY
    }

    try:
        # Use httpx for async-compatible network requests
        async with httpx.AsyncClient() as client:
            response = await client.get(base_url, params=params)
            response.raise_for_status() 
            data = response.json()

        if data['status'] != 'OK':
            print(f"Google Geocoding Error: {data['status']}")
            return "N/A", "N/A"

        full_address = data['results'][0]['formatted_address']
        ward_name = "N/A"
        district_name = "N/A"
        for component in data['results'][0]['address_components']:
            types = component['types']
            if 'sublocality_level_1' in types:
                ward_name = component['long_name']
            if 'administrative_area_level_3' in types:
                district_name = component['long_name']
        final_admin_name = ward_name if ward_name != 'N/A' else district_name
        return final_admin_name, full_address
    except httpx.RequestError as e:
        print(f"Geocoding HTTP request error: {e}")
        return "N/A", "N/A"
    except Exception as e:
        print(f"Geocoding parsing error: {e}")
        return "N/A", "N/A"


# --- FastAPI Application Setup ---
app = FastAPI()
cv_service = CVInferenceService()

origins = [
    FRONTEND_ORIGIN,
    "http://127.0.0.1:5173",
    "http://localhost:5174"
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- API Endpoints ---

@app.get("/")
def read_root():
    return {"message": "Civic Problem Detection API is running"}


@app.post("/vision/detect", response_model=DetectionResult)
async def detect_pothole(payload: ImagePayload):
    """(Step 1) Receives an image, runs AI detection, and returns bounding boxes."""
    image = cv_service.decode_base64_image(payload.image)
    
    # Run blocking ML call in a thread pool to avoid blocking the server
    detections = await run_in_threadpool(cv_service.run_inference, image) 

    pothole_detected = len(detections) > 0

    if pothole_detected:
        message = f"Potholes detected ({len(detections)} instances)."
    else:
        message = "No potholes detected. You can still submit a manual report."

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

    # Await async geocoding
    ward_name, full_address = await get_ward_from_coords(lat, lon)

    try:
        # Run blocking image upload in a thread pool
        upload_result = await run_in_threadpool(
            cloudinary.uploader.upload,
            payload.image,
            folder="pothole_reports"
        )
        image_url = upload_result.get("secure_url")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image upload error: {str(e)}")

    try:
        report_document = {
            "problem_type": "pothole",
            "location": {
                "type": "Point",
                "coordinates": [lon, lat]
            },
            "ward_name": ward_name,
            "full_address": full_address,
            "image_url": image_url,
            "detections": [d.dict() for d in payload.detections],
            "status": "new",
            "created_at": datetime.utcnow()
        }
        insert_result = problems_collection.insert_one(report_document)
        return {
            "message": "Report submitted successfully!",
            "report_id": str(insert_result.inserted_id),
            "ward_name": ward_name,
            "full_address": full_address,
            "image_url": image_url
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")