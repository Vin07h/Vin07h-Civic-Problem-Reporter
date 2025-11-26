# backend/main.py
import base64
import os
import io
import cv2
import numpy as np
import httpx
import cloudinary
import cloudinary.uploader
from pymongo import MongoClient
from bson import ObjectId
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel
from ultralytics import YOLO
from datetime import datetime

# --- 1. Setup & Config ---
load_dotenv()
app = FastAPI()

# Explicit CORS
origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.options("/{rest_of_path:path}")
async def preflight_handler(rest_of_path: str):
    return Response(
        content="OK",
        media_type="text/plain",
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
            "Access-Control-Allow-Headers": "*",
        }
    )

# --- 2. Database & Cloudinary ---
ATLAS_URI = os.getenv("ATLAS_URI")
DB_NAME = os.getenv("DB_NAME", "civic_db")
try:
    mongo_client = MongoClient(ATLAS_URI)
    db = mongo_client[DB_NAME]
    problems_collection = db.problems
    print(f"MongoDB Connected: {DB_NAME}")
except Exception as e:
    print(f"MongoDB Error: {e}")
    mongo_client = None

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET")
)

# --- 3. Models ---
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

class FinalReportPayload(BaseModel):
    image: str
    location: dict
    detections: list 

class ReportStatusUpdate(BaseModel):
    status: str

# --- 4. Helper: Draw Boxes on Image ---
def burn_boxes_into_image(base64_str, detections):
    """
    Decodes base64, draws bounding boxes, and returns a BytesIO object
    ready for upload.
    """
    try:
        # 1. Decode
        if ',' in base64_str:
            base64_str = base64_str.split(',')[1]
        img_data = base64.b64decode(base64_str)
        nparr = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None: return None

        # 2. Draw Boxes
        for d in detections:
            # Handle dict inputs
            if isinstance(d, dict):
                x1, y1 = int(d.get('x_min', 0)), int(d.get('y_min', 0))
                x2, y2 = int(d.get('x_max', 0)), int(d.get('y_max', 0))
                label = d.get('class_name', 'Issue')
                conf = float(d.get('confidence', 0))
                
                # Colors (BGR): Red for Pothole, Orange for Garbage
                color = (0, 0, 255) if 'pothole' in label.lower() else (0, 140, 255)
                
                # Draw Rectangle
                cv2.rectangle(img, (x1, y1), (x2, y2), color, 3)
                
                # Draw Label with background
                text = f"{label} {conf:.0%}"
                (w, h), _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
                cv2.rectangle(img, (x1, y1 - 25), (x1 + w, y1), color, -1) # Filled bg
                cv2.putText(img, text, (x1, y1 - 6), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)

        # 3. Encode back to JPG
        success, buffer = cv2.imencode('.jpg', img)
        if not success: return None
        
        return io.BytesIO(buffer)
    except Exception as e:
        print(f"Error drawing boxes: {e}")
        return None

# --- 5. CV Service ---
class CVInferenceService:
    def __init__(self):
        print("\n--- LOADING AI MODELS ---")
        self.model_pothole = self.load_model(os.path.join("model", "best.pt"), "Pothole")
        self.model_garbage = self.load_model(os.path.join("model", "garbagedetectionbest.pt"), "Garbage")

    def load_model(self, path, name):
        if os.path.exists(path):
            try: return YOLO(path)
            except: return None
        return None

    def decode_base64_image(self, base64_string):
        if ',' in base64_string:
            base64_string = base64_string.split(',')[1]
        image_bytes = base64.b64decode(base64_string)
        np_array = np.frombuffer(image_bytes, np.uint8)
        return cv2.imdecode(np_array, cv2.IMREAD_COLOR)

    def run_inference(self, image):
        detections = []
        # Run Models (Pothole & Garbage) with threshold 0.15
        for model, name in [(self.model_pothole, "Pothole"), (self.model_garbage, "Garbage")]:
            if model:
                try:
                    results = model.predict(image, conf=0.15, verbose=False)
                    for r in results:
                        for box in r.boxes:
                            detections.append(BoundingBox(
                                x_min=float(box.xyxy[0][0]), y_min=float(box.xyxy[0][1]),
                                x_max=float(box.xyxy[0][2]), y_max=float(box.xyxy[0][3]),
                                confidence=float(box.conf[0]), class_name=name
                            ))
                except Exception as e: print(f"{name} Error: {e}")
        return detections

cv_service = CVInferenceService()

# --- 6. API Routes ---

@app.get("/")
def read_root():
    return {"message": "API is running"}

@app.post("/vision/detect")
async def detect_problems(payload: ImagePayload):
    try:
        image = cv_service.decode_base64_image(payload.image)
        if image is None: return {"status": "error", "message": "Invalid Image", "detections": []}

        detections = await run_in_threadpool(cv_service.run_inference, image)
        has_problems = len(detections) > 0
        msg = f"Detected {len(detections)} issues." if has_problems else "No issues detected."

        return {
            "status": "success",
            "problems_detected": has_problems,
            "message": msg,
            "detections": [d.dict() for d in detections]
        }
    except Exception as e:
        print(f"Vision API Error: {e}")
        return {"status": "error", "message": str(e), "detections": []}

@app.post("/report/submit")
async def submit_report(payload: FinalReportPayload):
    if not mongo_client:
        return {"status": "error", "message": "DB not connected"}

    try:
        report_data = payload.dict()
        
        # --- NEW: Process Image to Add Boxes ---
        # Instead of uploading raw base64, we process it first
        image_file_to_upload = payload.image # Fallback
        
        processed_image_stream = await run_in_threadpool(
            burn_boxes_into_image, 
            payload.image, 
            payload.detections
        )
        
        if processed_image_stream:
            print("Image processed with bounding boxes.")
            image_file_to_upload = processed_image_stream
        else:
            print("Failed to draw boxes, uploading original.")

        # --- Cloudinary Upload ---
        image_url = "https://via.placeholder.com/600x400?text=Upload+Failed"
        try:
            if os.getenv("CLOUDINARY_CLOUD_NAME"):
                upload_result = await run_in_threadpool(
                    cloudinary.uploader.upload,
                    image_file_to_upload, # Uploading the processed stream
                    folder="civic_problem_reports"
                )
                image_url = upload_result.get("secure_url", image_url)
        except Exception as img_err:
            print(f"Cloudinary Error: {img_err}")

        # --- Cleanup & Save ---
        if "image" in report_data: del report_data["image"]
        
        report_data["image_url"] = image_url
        report_data["status"] = "new"
        report_data["created_at"] = datetime.utcnow()
        report_data.setdefault("ward_name", "Unknown")
        report_data.setdefault("full_address", "Unknown Location")

        # Determine Types
        types = list(set([d.get("class_name", "Manual") for d in report_data.get("detections", [])]))
        report_data["problem_types"] = types if types else ["Manual"]

        result = problems_collection.insert_one(report_data)
        
        return {
            "status": "success",
            "message": "Report submitted successfully!",
            "report_id": str(result.inserted_id)
        }

    except Exception as e:
        print(f"Submit Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/admin/reports")
async def get_all_reports():
    if not mongo_client: raise HTTPException(500, "DB Disconnected")
    reports = list(problems_collection.find().sort("created_at", -1))
    clean = []
    for r in reports:
        r["_id"] = str(r["_id"])
        r.setdefault("problem_types", ["Manual"])
        r.setdefault("image_url", "https://via.placeholder.com/150")
        r.setdefault("ward_name", "Unknown")
        r.setdefault("full_address", "Unknown")
        r.setdefault("status", "new")
        r.setdefault("created_at", datetime.utcnow())
        r.setdefault("detections", [])
        clean.append(r)
    return clean

@app.patch("/admin/report/{report_id}")
async def update_status(report_id: str, u: ReportStatusUpdate):
    if not ObjectId.is_valid(report_id): raise HTTPException(400, "Invalid ID")
    problems_collection.update_one({"_id": ObjectId(report_id)}, {"$set": {"status": u.status}})
    return {"status": "updated"}