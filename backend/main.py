import base64
import numpy as np
import cv2
import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
# --- Pydantic Models ---

class BoundingBox(BaseModel):
    """Represents a single detected object."""
    x_min: float
    y_min: float
    x_max: float
    y_max: float
    confidence: float
    class_name: str

class ImagePayload(BaseModel):
    """Defines the structure of the incoming image and coordinates."""
    image: str
    latitude: float
    longitude: float

class DetectionResult(BaseModel):
    """Defines the structure of the successful response."""
    status: str
    pothole_detected: bool
    latitude: float
    longitude: float
    message: str
    detections: list[BoundingBox]


# --- Computer Vision Inference Service ---
class CVInferenceService:
    """
    Handles all Ultralytics YOLO model loading and inference logic.
    """
    def __init__(self):
        # This is a placeholder from a previous version, I'll remove it to avoid confusion.
        
        self.MODEL_PATH = os.path.join("model", "best.pt")
        
        try:
            # 1. Load the YOLO model directly from the .pt file
            # YOLO automatically uses PyTorch or the best available backend.
            self.model = YOLO(self.MODEL_PATH)
            
            # The class index for 'pothole' must be identified from the trained model.
            # We assume the first class (index 0) is 'pothole' if the model was trained only on potholes.
            # NOTE: Verify the class name in your Roboflow export and change 'pothole' if needed.
            self.TARGET_CLASS_NAME = 'pothole' 
            self.CONFIDENCE_THRESHOLD = 0.25
            self.IOU_THRESHOLD = 0.5 # Intersection over Union threshold for NMS
            
            print(f"INFO: YOLO model loaded successfully from {self.MODEL_PATH}.")

        except Exception as e:
            print(f"FATAL ERROR: Could not load YOLO model. Ensure {self.MODEL_PATH} exists.")
            print(f"DETAILS: {e}")
            self.model = None

    def decode_base64_image(self, base64_string: str) -> np.ndarray:
        """Converts a base64 string to an OpenCV image (NumPy array)."""
        # Remove the metadata prefix (e.g., 'data:image/jpeg;base64,')
        if ',' in base64_string:
            base64_string = base64_string.split(',')[1]
            
        try:
            image_bytes = base64.b64decode(base64_string)
            np_array = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(np_array, cv2.IMREAD_COLOR)
            
            if img is None:
                raise ValueError("cv2.imdecode failed to convert data to image.")
            
            # Ultralytics model can directly take this BGR NumPy array
            return img
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid image format or decoding error: {e}")

    def run_inference(self, image: np.ndarray) -> list[BoundingBox]:
        """
        Runs the YOLO model on the input image and returns a list of all detected pothole bounding boxes.
        """
        if not self.model:
            return [] 

        # Run the predict method
        results = self.model.predict(
            source=image, 
            conf=self.CONFIDENCE_THRESHOLD,
            iou=self.IOU_THRESHOLD, 
            verbose=False,
            imgsz=640 # Default input size for YOLOv8 models
        )

        detected_potholes: list[BoundingBox] = []

        if results and len(results) > 0:
            result = results[0]
            
            # Iterate through all detected boxes that survived NMS
            for box in result.boxes:
                class_index = int(box.cls[0])
                class_name = result.names[class_index] 
                confidence = float(box.conf[0])
                
                # We only care about the class we trained for
                if class_name.lower() == self.TARGET_CLASS_NAME:
                    # Extract pixel coordinates [x_min, y_min, x_max, y_max] 
                    # box.xyxy is a tensor of shape (1, 4). Convert to Python list.
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


# --- FastAPI Application Setup ---
app = FastAPI()

# Instantiate the CV service globally
cv_service = CVInferenceService()

# --- CORS Configuration ---
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/vision/detect", response_model=DetectionResult)
async def detect_pothole(payload: ImagePayload):
    """
    Receives image data, runs the YOLO pothole detection model, and returns the result, 
    including the bounding box for visualization.
    """
    
    # 1. Decode the image
    image = cv_service.decode_base64_image(payload.image)

    # 2. Run the detection logic - Returns a list of all detected potholes
    detections = cv_service.run_inference(image)
    
    pothole_detected = len(detections) > 0

    # 3. Construct and return the final response
    if pothole_detected:
        message = f"Potholes detected ({len(detections)} instances)."
    else:
        # If confidence is low, fall back to manual selection scenario
        message = "No potholes detected above the confidence threshold. Manual selection required or check detection threshold."
        
    return DetectionResult(
        status="success",
        pothole_detected=pothole_detected,
        latitude=payload.latitude,
        longitude=payload.longitude,
        message=message,
        detections=detections
    )

@app.get("/")
def read_root():
    return {"message": "Civic Problem Detection API is running"}