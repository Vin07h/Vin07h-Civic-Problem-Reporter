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
from bson import ObjectId  # <-- **NEW**: Import ObjectId to query by _id
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, File, Form
from pydantic import BaseModel, Field
from fastapi.middleware.cors import CORSMiddleware
from fastapi.concurrency import run_in_threadpool
from ultralytics import YOLO
# Import internal loader so we can reload models without fusing if necessary
try:
    from ultralytics.nn.tasks import load_checkpoint
except Exception:
    load_checkpoint = None

# --- API Keys and Configs ---
load_dotenv()

# Helper to read env vars and tolerate common formatting issues (quotes, surrounding spaces)
def getenv_clean(key, default=None):
    v = os.getenv(key)
    if v is None:
        return default
    v = v.strip()
    # Strip surrounding quotes if present
    if (v.startswith('"') and v.endswith('"')) or (v.startswith("'") and v.endswith("'")):
        v = v[1:-1]
    return v

GOOGLE_MAPS_API_KEY = getenv_clean("GOOGLE_MAPS_API_KEY")
FRONTEND_ORIGIN = getenv_clean("FRONTEND_ORIGIN") or "http://localhost:5173"

cloudinary.config(
    cloud_name=getenv_clean("CLOUDINARY_CLOUD_NAME"),
    api_key=getenv_clean("CLOUDINARY_API_KEY"),
    api_secret=getenv_clean("CLOUDINARY_API_SECRET")
)

ATLAS_URI = getenv_clean("ATLAS_URI")
# Accept multiple key casings used by various .env files (DB_NAME, DB_name)
DB_NAME = getenv_clean("DB_NAME") or getenv_clean("DB_name") or getenv_clean("DB")
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
    problems_detected: bool
    latitude: float
    longitude: float
    message: str
    detections: list[BoundingBox]

class FinalReportPayload(BaseModel):
    image: str
    location: dict
    detections: list[BoundingBox]

# --- **NEW**: Pydantic model for Admin updates ---
class ReportStatusUpdate(BaseModel):
    status: str

# --- **NEW**: Pydantic model for returning report data ---
# We need this to handle converting MongoDB's _id
class ProblemReport(BaseModel):
    id: str = Field(..., alias="_id")  # This handles the _id -> id mapping
    problem_types: list[str]
    location: dict
    ward_name: str
    full_address: str
    image_url: str
    detections: list[BoundingBox]
    status: str
    created_at: datetime

    class Config:
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
# --- End of new models ---


# --- Computer Vision Inference Service ---
class CVInferenceService:
    def __init__(self):
        self.POTHOLE_MODEL_PATH = os.path.join("model", "best.pt")
        self.GARBAGE_MODEL_PATH = os.path.join("model", "garbagedetectionbest.pt")
        self.CONFIDENCE_THRESHOLD = 0.25
        self.IOU_THRESHOLD = 0.5
        self.model_pothole = self.load_model(self.POTHOLE_MODEL_PATH, "Pothole")
        self.model_garbage = self.load_model(self.GARBAGE_MODEL_PATH, "Garbage")

    def load_model(self, path: str, model_name: str):
        if not os.path.exists(path):
            print(f"FATAL ERROR: Could not find {model_name} model at {path}")
            return None
        try:
            model = YOLO(path)
            # Prevent ultralytics from attempting to fuse Conv+BatchNorm layers
            # for models that don't expose a BN attribute on Conv instances.
            # We patch `fuse` to a no-op so downstream code won't attempt fusion.
            try:
                if hasattr(model, "fuse"):
                    model.fuse = lambda verbose=True: model
                if hasattr(model, "model") and hasattr(model.model, "fuse"):
                    model.model.fuse = lambda verbose=True: model.model
            except Exception:
                # If monkey-patching fails, continue — we will handle errors at inference time
                pass

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
        detections = []
        if not results or len(results) == 0:
            return detections
        result = results[0]
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
        all_detections: list[BoundingBox] = []
        if self.model_pothole:
            try:
                pothole_results = self.model_pothole.predict(
                    source=image, conf=self.CONFIDENCE_THRESHOLD, iou=self.IOU_THRESHOLD, verbose=False, imgsz=640
                )
                all_detections.extend(self._process_results(pothole_results))
            except Exception as e:
                print(f"Error during pothole inference: {e}")
                # If the error looks like a Conv/Bn fusion problem, try reloading without fusion and retry once
                if "bn" in str(e).lower() or "batchnorm" in str(e).lower() or "'conv' object has no attribute 'bn'" in str(e).lower():
                    print("Attempting to reload pothole model without fusion and retry inference...")
                    try:
                        if load_checkpoint:
                            loaded, _ = load_checkpoint(self.POTHOLE_MODEL_PATH, fuse=False)
                            # Replace the model and retry prediction
                            self.model_pothole = loaded
                            pothole_results = self.model_pothole.predict(
                                source=image, conf=self.CONFIDENCE_THRESHOLD, iou=self.IOU_THRESHOLD, verbose=False, imgsz=640
                            )
                            all_detections.extend(self._process_results(pothole_results))
                        else:
                            print("load_checkpoint not available in this ultralytics installation; cannot reload without fusion.")
                    except Exception as e2:
                        print(f"Retry without fusion also failed: {e2}")
        else:
            print("Pothole model not loaded, skipping.")
        if self.model_garbage:
            try:
                garbage_results = self.model_garbage.predict(
                    source=image, conf=self.CONFIDENCE_THRESHOLD, iou=self.IOU_THRESHOLD, verbose=False, imgsz=640
                )
                all_detections.extend(self._process_results(garbage_results))
            except Exception as e:
                print(f"Error during garbage inference: {e}")
                if "bn" in str(e).lower() or "batchnorm" in str(e).lower() or "'conv' object has no attribute 'bn'" in str(e).lower():
                    print("Attempting to reload garbage model without fusion and retry inference...")
                    try:
                        if load_checkpoint:
                            loaded, _ = load_checkpoint(self.GARBAGE_MODEL_PATH, fuse=False)
                            self.model_garbage = loaded
                            garbage_results = self.model_garbage.predict(
                                source=image, conf=self.CONFIDENCE_THRESHOLD, iou=self.IOU_THRESHOLD, verbose=False, imgsz=640
                            )
                            all_detections.extend(self._process_results(garbage_results))
                        else:
                            print("load_checkpoint not available in this ultralytics installation; cannot reload without fusion.")
                    except Exception as e2:
                        print(f"Retry without fusion also failed: {e2}")
        else:
            print("Garbage model not loaded, skipping.")
        return all_detections

# --- Helper Function for Geocoding ---
async def get_ward_from_coords(lat: float, lon: float):
    base_url = "https://maps.googleapis.com/maps/api/geocode/json"
    params = {"latlng": f"{lat},{lon}", "key": GOOGLE_MAPS_API_KEY}
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
cv_service = CVInferenceService()

# For local development allow the frontend origins; if you need a quick
# development bypass set DEV_ALLOW_ALL_ORIGINS=true in your env to allow '*'.
DEV_ALLOW_ALL = getenv_clean("DEV_ALLOW_ALL_ORIGINS", "false").lower() == "true"
if DEV_ALLOW_ALL:
    print("Warning: DEV_ALLOW_ALL_ORIGINS=true -> allowing all CORS origins (development only)")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    origins = [
        FRONTEND_ORIGIN,
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        "http://127.0.0.1:5174",
        "http://localhost:5174",
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
async def detect_problems(payload: ImagePayload):
    image = cv_service.decode_base64_image(payload.image)
    detections = await run_in_threadpool(cv_service.run_inference, image)
    problems_detected = len(detections) > 0
    if problems_detected:
        problem_counts = {}
        for d in detections:
            problem_counts[d.class_name] = problem_counts.get(d.class_name, 0) + 1
        message_parts = [f"{count} {name}(s)" for name, count in problem_counts.items()]
        message = f"Problems detected: {', '.join(message_parts)}."
    else:
        message = "No problems detected. You can still submit a manual report."
    return DetectionResult(
        status="success",
        problems_detected=problems_detected,
        latitude=payload.latitude,
        longitude=payload.longitude,
        message=message,
        detections=detections
    )

@app.post("/report/submit")
async def submit_report(payload: FinalReportPayload):
    if not mongo_client:
        raise HTTPException(status_code=500, detail="Database not connected")
    lat = payload.location.get('lat')
    lon = payload.location.get('lng')
    ward_name, full_address = await get_ward_from_coords(lat, lon)
    try:
        upload_result = await run_in_threadpool(
            cloudinary.uploader.upload,
            payload.image,
            folder="civic_problem_reports"
        )
        image_url = upload_result.get("secure_url")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image upload error: {str(e)}")
    try:
        problem_types = list(set([d.class_name for d in payload.detections]))
        if not problem_types:
            problem_types = ["manual"]
        report_document = {
            "problem_types": problem_types,
            "location": {"type": "Point", "coordinates": [lon, lat]},
            "ward_name": ward_name,
            "full_address": full_address,
            "image_url": image_url,
            "detections": [d.dict() for d in payload.detections],
            "status": "new", # Default status
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

# --- ================================== ---
# ---       ** NEW ADMIN ENDPOINTS ** ---
# --- ================================== ---

# --- **NEW**: Get all reports (for admin) ---
# --- **NEW**: Get all reports (for admin) ---
@app.get("/admin/reports", response_model=list[ProblemReport])
async def get_all_reports():
    """
    Fetches all reports from the database, sorted by newest first.
    This will also migrate old schema data to the new format.
    """
    if not mongo_client:
        raise HTTPException(status_code=500, detail="Database not connected")
    try:
        # Find all reports and sort by 'created_at' in descending order
        reports_cursor = problems_collection.find().sort("created_at", -1)
        
        # --- **FIXED** ---
        # We must manually loop and build a list that matches the Pydantic model
        # to handle both schema migration and ObjectId conversion.
        
        report_list = []
        for report in reports_cursor:
            
            # --- Fix 1: Handle schema mismatch (problem_type vs problem_types) ---
            if "problem_types" not in report and "problem_type" in report:
                # This is an old document. Create the new field.
                report["problem_types"] = [report["problem_type"]]
            elif "problem_types" not in report and "problem_type" not in report:
                # This doc is somehow missing both. Add a default to pass validation.
                report["problem_types"] = ["N/A"]

            # --- Fix 2: Manually convert BSON ObjectId to a string ---
            # Pydantic's 'alias' needs the key to be '_id'
            report["_id"] = str(report["_id"])

            # Now the 'report' dictionary matches our Pydantic model
            report_list.append(report)
            
        return report_list
        # --- **END OF FIX** ---

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database query error: {str(e)}")
# --- **NEW**: Update a report's status (for admin) ---
@app.patch("/admin/report/{report_id}", response_model=ProblemReport)
async def update_report_status(report_id: str, update_data: ReportStatusUpdate):
    """
    Updates the 'status' of a single report by its ID.
    TODO: Add authentication to this endpoint!
    """
    if not mongo_client:
        raise HTTPException(status_code=500, detail="Database not connected")
    
    # Check if the provided ID is a valid MongoDB ObjectId
    if not ObjectId.is_valid(report_id):
        raise HTTPException(status_code=400, detail=f"Invalid Report ID: {report_id}")

    try:
        # Find the document by its ID and update the 'status' field
        result = problems_collection.find_one_and_update(
            {"_id": ObjectId(report_id)},
            {"$set": {"status": update_data.status}},
            return_document=True  # Return the document *after* the update
        )
        
        if result:
            # Convert _id to string for the response
            result["_id"] = str(result["_id"])
            return result
        else:
            raise HTTPException(status_code=404, detail=f"Report with ID {report_id} not found")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database update error: {str(e)}")