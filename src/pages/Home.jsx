import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/shared/Button';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents, Popup } from 'react-leaflet';
import { getCurrentLocation } from '../utils/helpers';
import LocationDisplay from '../components/shared/LocationDisplay';
import './Home.css';

// Helper component to programmatically change the map's view
function ChangeView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);
  return null;
}

// Helper component to handle map clicks and display a movable marker
function LocationMarker({ position, setPosition, accuracy }) {
  const markerRef = useRef(null);
  const map = useMapEvents({
    click(e) {
      // When the map is clicked, update the location state
      setPosition({ latitude: e.latlng.lat, longitude: e.latlng.lng, accuracy });
      map.flyTo(e.latlng, map.getZoom());
    },
  });

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const { lat, lng } = marker.getLatLng();
          setPosition({ latitude: lat, longitude: lng, accuracy });
        }
      },
    }),
    [setPosition, accuracy],
  );

  if (!position) {
    return null;
  }

  return (
    <Marker draggable={true} eventHandlers={eventHandlers} position={[position.latitude, position.longitude]} ref={markerRef}>
      <Popup>Drag me to the correct location</Popup>
    </Marker>
  );
}

const Home = () => {
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [error, setError] = useState(null);
  const [location, setLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const videoRef = useRef(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const navigate = useNavigate();

  // Effect to get access to the user's camera
  useEffect(() => {
    const getMedia = async () => {
      // Only run if the camera is supposed to be active
      if (!isCameraActive) return;
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }, // Prefer the rear camera
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        setError('Could not access the camera. Please check permissions and try again.');
      }
    };

    getMedia();

    // Cleanup function to stop the video stream when the component unmounts
    return () => {
      stopStream();
    };
  }, [isCameraActive]);

  const stopStream = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const handleCapture = async () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      // Set canvas dimensions to match the video stream
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw the current video frame onto the canvas
      const context = canvas.getContext('2d');
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Get location while capturing the image
      try {
        setError(null); // Clear previous errors
        const coords = await getCurrentLocation();
        setLocation(coords);
      } catch (locationError) {
        console.error("Error getting location:", locationError);
        setError("Could not get location. You can still proceed and add it manually later.");
        setLocation(null);
      }

      // Get the image data from the canvas
      const imageDataUrl = canvas.toDataURL('image/jpeg');
      setCapturedImage(imageDataUrl);
      stopStream();
      setIsCameraActive(false);
    }
  };

  const handleUploadClick = () => {
    // Trigger the hidden file input
    fileInputRef.current.click();
  };

  const processFile = (file) => {
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Invalid file type. Please upload an image.');
        return;
      }
      setError(null); // Clear previous errors

      const reader = new FileReader();
      reader.onloadend = async () => {
        setCapturedImage(reader.result);
        try {
          const coords = await getCurrentLocation();
          setLocation(coords);
        } catch (locationError) {
          console.error("Error getting location:", locationError);
          setError("Could not get location. You can still proceed and add it manually later.");
          setLocation(null);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileChange = (event) => {
    if (event.target.files && event.target.files[0]) {
      processFile(event.target.files[0]);
    }
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation(); // Necessary to allow for drop
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setError(null);
    setLocation(null);
    setIsCameraActive(false); // Go back to the initial choice screen
    // Reset the file input so the user can upload the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = null;
    }
  };

  const handleConfirm = () => {
    if (!capturedImage) return;
    navigate('/report-review', { state: { image: capturedImage, location } });
  };

  return (
    <div className="card home-page" style={{ maxWidth: '600px', margin: '2rem auto' }}>
      <div className="home-page__content-wrapper">
        {isLoading && <LoadingSpinner />}

        {/* State 1: Initial choice */}
        {!isCameraActive && !capturedImage && (
          <div
            className={`initial-choice ${isDragging ? 'dragging-over' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
          >
            {isDragging ? (
              <p>Drop the image here</p>
            ) : (
              <p>Drag & drop an image here, or click to select</p>
            )}
            <Button onClick={() => setIsCameraActive(true)}>Take a Picture</Button>
            <Button onClick={handleUploadClick} variant="secondary">Upload from Device</Button>
          </div>
        )}

        {/* State 2: Camera is active */}
        {isCameraActive && (
          <>
            <video ref={videoRef} autoPlay playsInline className="video-feed" />
            <div className="capture-button-container" style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)' }}>
              <Button onClick={handleCapture} disabled={!stream}>Capture</Button>
            </div>
          </>
        )}

        {/* State 3: Image preview */}
        {capturedImage && !isLoading && (
          <div className="preview-container">
            <h2>Preview</h2>
            <img src={capturedImage} alt="Captured pothole" className="preview-image" />
            {location && (
              <div className="location-preview" style={{ marginTop: '1rem' }}>
                <p style={{ textAlign: 'center', fontStyle: 'italic', color: '#333' }}>
                  Please confirm the location. You can drag the marker or click on the map to adjust.
                </p>
                <LocationDisplay latitude={location.latitude} longitude={location.longitude} accuracy={location.accuracy} />
                <MapContainer center={[location.latitude, location.longitude]} zoom={16} scrollWheelZoom={false} className="map-container">
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <ChangeView center={[location.latitude, location.longitude]} zoom={16} />
                  <LocationMarker position={location} setPosition={setLocation} accuracy={location.accuracy} />
                </MapContainer>
              </div>
            )}
            {error && <p className="error-text">{error}</p>}
            <div className="actions">
              <Button onClick={handleConfirm}>Confirm</Button>
              <Button onClick={handleRetake} variant="secondary">Retake</Button>
            </div>
          </div>
        )}
      </div>

      <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} accept="image/png, image/jpeg" />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
};

export default Home;