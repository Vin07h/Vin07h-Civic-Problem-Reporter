import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/shared/Button';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents, Popup } from 'react-leaflet';
import { getCurrentLocation } from '../utils/helpers';
import LocationDisplay from '../components/shared/LocationDisplay';
import './Home.css';

// (Helper components ChangeView and LocationMarker are unchanged)
function ChangeView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);
  return null;
}
function LocationMarker({ position, setPosition, accuracy }) {
  const markerRef = useRef(null);
  const map = useMapEvents({
    click(e) {
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
// (End of helper components)


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

  useEffect(() => {
    const getMedia = async () => {
      if (!isCameraActive) return;
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
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
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // (UPDATED) We now get accuracy from the location
      setIsLoading(true);
      try {
        setError(null);
        const coords = await getCurrentLocation();
        setLocation(coords);
      } catch (locationError) {
        console.error("Error getting location:", locationError);
        setError("Could not get location. You can add it manually in the next step.");
        setLocation(null);
      }
      setIsLoading(false);

      const imageDataUrl = canvas.toDataURL('image/jpeg');
      setCapturedImage(imageDataUrl);
      stopStream();
      setIsCameraActive(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current.click();
  };

  const processFile = (file) => {
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Invalid file type. Please upload an image.');
        return;
      }
      setError(null);
      setIsLoading(true);

      const reader = new FileReader();
      reader.onloadend = async () => {
        setCapturedImage(reader.result);
        try {
          const coords = await getCurrentLocation();
          setLocation(coords);
        } catch (locationError) {
          console.error("Error getting location:", locationError);
          setError("Could not get location. You can add it manually in the next step.");
          setLocation(null);
        }
        setIsLoading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileChange = (event) => {
    if (event.target.files && event.target.files[0]) {
      processFile(event.target.files[0]);
    }
  };

  // --- Drag and Drop Handlers ---
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
    e.stopPropagation();
  };
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };
  // --- End Drag and Drop ---

  const handleRetake = () => {
    setCapturedImage(null);
    setError(null);
    setLocation(null);
    setIsCameraActive(false); 
    if (fileInputRef.current) {
      fileInputRef.current.value = null;
    }
  };

  const handleConfirm = () => {
    if (!capturedImage) return;
    // Pass the location (even if it's null) to the review page
    navigate('/report-review', { state: { image: capturedImage, location } });
  };

  return (
    // (FIX) We remove the <div className="card"> wrapper
    // because the Layout component provides it now.
    <div className="home-page"> 
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
            <div className="capture-button-container" style={{ position: 'relative', marginTop: '1rem' }}>
              <Button onClick={handleCapture} disabled={!stream}>Capture</Button>
            </div>
          </>
        )}

        {/* State 3: Image preview */}
        {capturedImage && !isLoading && (
          <div className="preview-container">
            <h2>Preview</h2>
            <img src={capturedImage} alt="Captured pothole" className="preview-image" />
            
            {/* Location Section */}
            <div className="location-preview" style={{ marginTop: '1rem' }}>
              {location ? (
                <>
                  <p style={{ textAlign: 'center', fontStyle: 'italic', color: '#333' }}>
                    Drag the pin to confirm the location.
                  </p>
                  {/* (UPDATED) Pass accuracy to the display */}
                  <LocationDisplay latitude={location.latitude} longitude={location.longitude} accuracy={location.accuracy} />
                  <MapContainer center={[location.latitude, location.longitude]} zoom={16} scrollWheelZoom={false} className="map-container">
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <ChangeView center={[location.latitude, location.longitude]} zoom={16} />
                    <LocationMarker position={location} setPosition={setLocation} accuracy={location.accuracy} />
                  </MapContainer>
                </>
              ) : (
                // This shows if location failed but image succeeded
                <p className="error-text">
                  {error || "Location not found. You can set it on the next page."}
                </p>
              )}
            </div>
            
            {/* Show general errors if they exist */}
            {error && !location && <p className="error-text">{error}</p>}

            {/* Actions Section */}
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