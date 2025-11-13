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
    problems_detected: bool  # <-- RENAMED from pothole_detected
    latitude: float
    longitude: float
    message: str
    detections: list[BoundingBox]

class FinalReportPayload(BaseModel):
    image: str
    location: dict
    detections: list[BoundingBox]


# --- Computer Vision Inference Service ---
# --- Computer Vision Inference Service ---
class CVInferenceService:
    def __init__(self):
        # --- 1. DEFINE MODEL PATHS ---
        self.POTHOLE_MODEL_PATH = os.path.join("model", "best.pt")
        self.GARBAGE_MODEL_PATH = os.path.join("model", "garbagedetectionbest.pt") # From your previous file
        
        self.CONFIDENCE_THRESHOLD = 0.25
        self.IOU_THRESHOLD = 0.5
        
        # --- 2. LOAD MODELS AT STARTUP ---
        # This is the code that fixes your error.
        # It creates self.model_pothole and self.model_garbage
        self.model_pothole = self.load_model(self.POTHOLE_MODEL_PATH, "Pothole")
        self.model_garbage = self.load_model(self.GARBAGE_MODEL_PATH, "Garbage")

    def load_model(self, path: str, model_name: str):
        """Helper function to load a YOLO model."""
        if not os.path.exists(path):
            print(f"FATAL ERROR: Could not find {model_name} model at {path}")
            return None
        try:
            model = YOLO(path)
            print(f"{model_name} model loaded successfully from {path}")
            return model
        except Exception as e:
            print(f"Error loading {model_name} model: {e}")
            return None

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

    def _process_results(self, results) -> list[BoundingBox]:
        """Helper to extract detections from a YOLO result object."""
        detections = []
        if not results or len(results) == 0:
            return detections
        
        result = results[0]  # Get the first result
        for box in result.boxes:
            class_index = int(box.cls[0])
            class_name = result.names[class_index]
            confidence = float(box.conf[0])
            coords = box.xyxy[0].tolist()

            detections.append(
                BoundingBox(
                    x_min=round(coords[0]),
                    y_min=round(coords[1]),
                    x_max=round(coords[2]),
                    y_max=round(coords[3]),
                    confidence=round(confidence, 4),
                    class_name=class_name
                )
            )
        return detections

    def run_inference(self, image: np.ndarray) -> list[BoundingBox]:
        """Runs inference with *both* models and combines results."""
        all_detections: list[BoundingBox] = []

        # --- 1. Pothole Inference ---
        # This line (143) will now work because self.model_pothole exists
        if self.model_pothole:
            try:
                pothole_results = self.model_pothole.predict(
                    source=image,
                    conf=self.CONFIDENCE_THRESHOLD,
                    iou=self.IOU_THRESHOLD,
                    verbose=False,
                    imgsz=640
                )
                all_detections.extend(self._process_results(pothole_results))
            except Exception as e:
                print(f"Error during pothole inference: {e}")
        else:
            print("Pothole model not loaded, skipping.")

        # --- 2. Garbage Inference ---
        if self.model_garbage:
            try:
                garbage_results = self.model_garbage.predict(
                    source=image,
                    conf=self.CONFIDENCE_THRESHOLD,
                    iou=self.IOU_THRESHOLD,
                    verbose=False,
                    imgsz=640
                )
                all_detections.extend(self._process_results(garbage_results))
            except Exception as e:
                print(f"Error during garbage inference: {e}")
        else:
            print("Garbage model not loaded, skipping.")

        return all_detections
    
# --- Helper Function for Geocoding ---
async def get_ward_from_coords(lat: float, lon: float):
    """Uses Google Maps API to convert (lat, lon) into a ward/district."""
    base_url = "https://maps.googleapis.com/maps/api/geocode/json"
    params = {
        "latlng": f"{lat},{lon}",
        "key": GOOGLE_MAPS_API_KEY
    }
    try:
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
cv_service = CVInferenceService()  # This now loads both models on startup

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
async def detect_problems(payload: ImagePayload): # Renamed from detect_pothole
    """(Step 1) Receives image, runs all AI detections, and returns bounding boxes."""
    image = cv_service.decode_base64_image(payload.image)
    
    # Run blocking ML call in a thread pool
    # This now runs BOTH pothole and garbage models
    detections = await run_in_threadpool(cv_service.run_inference, image)

    problems_detected = len(detections) > 0

    if problems_detected:
        # Dynamically create a summary of problems
        problem_counts = {}
        for d in detections:
            problem_counts[d.class_name] = problem_counts.get(d.class_name, 0) + 1
        
        message_parts = [f"{count} {name}(s)" for name, count in problem_counts.items()]
        message = f"Problems detected: {', '.join(message_parts)}."
    else:
        message = "No problems detected. You can still submit a manual report."

    return DetectionResult(
        status="success",
        problems_detected=problems_detected, # <-- Updated field
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
            folder="civic_problem_reports" # More generic folder
        )
        image_url = upload_result.get("secure_url")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image upload error: {str(e)}")

    try:
        # --- DYNAMICALLY CREATE PROBLEM TYPES ---
        # Get unique problem types (e.g., ['pothole', 'garbage']) from detections
        problem_types = list(set([d.class_name for d in payload.detections]))
        
        # If no detections (manual report), set a default
        if not problem_types:
            problem_types = ["manual"]
        # --- End of dynamic logic ---

        report_document = {
            "problem_types": problem_types, # <-- CHANGED: Now a list
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
            "image_url": image_url,
            "problem_types": problem_types
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")