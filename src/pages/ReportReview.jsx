import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap, Popup } from 'react-leaflet';
import Button from '../components/shared/Button';
import LocationDisplay from '../components/shared/LocationDisplay';
import { compressImage } from '../utils/helpers';
import { sendImageForDetection, submitFinalReport } from '../services/apiService';
import DetectionViewer from '../components/shared/DetectionViewer';
import LoadingSpinner from '../components/shared/LoadingSpinner';

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
function LocationMarker({ position, setPosition }) {
  const markerRef = useRef(null);
  const map = useMapEvents({
    click(e) {
      setPosition({ lat: e.latlng.lat, lng: e.latlng.lng, accuracy: null });
      map.flyTo(e.latlng, map.getZoom());
    },
  });
  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const { lat, lng } = marker.getLatLng();
          setPosition({ lat, lng, accuracy: position?.accuracy || null });
        }
      },
    }),
    [position, setPosition],
  );
  if (!position) {
    return null;
  }
  return (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={[position.lat, position.lng]}
      ref={markerRef}
    >
      <Popup>Drag me to the exact spot</Popup>
    </Marker>
  );
}


const ReportReview = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const imageRef = useRef(location.state?.image);
  const locationRef = useRef(location.state?.location);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [apiResult, setApiResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // (REMOVED) We no longer need this state
  // const [submitMessage, setSubmitMessage] = useState(null);

  const getLeafletCompatibleLocation = (loc) => {
    if (!loc) return null;
    return { 
      lat: loc.latitude || loc.lat, 
      lng: loc.longitude || loc.lng,
      accuracy: loc.accuracy
    };
  };

  const [manualLocation, setManualLocation] = useState(getLeafletCompatibleLocation(locationRef.current));

  useEffect(() => {
    if (!imageRef.current) {
      navigate('/home');
    }
  }, [navigate]);

  useEffect(() => {
    const runDetection = async () => {
      if (!imageRef.current || !manualLocation) {
        if (!locationRef.current) {
          setError("Please select a location on the map to begin analysis.");
        }
        return;
      }
      if(apiResult) return;

      setIsLoading(true);
      setError(null);
      try {
        const compressed = await compressImage(imageRef.current, 800, 0.7);
        const result = await sendImageForDetection(compressed, manualLocation);
        setApiResult(result.data);
      } catch (err) {
        setError("Failed to analyze the image. Please try again.");
        console.error("Detection error:", err);
      } finally {
        setIsLoading(false);
      }
    };
    runDetection();
  }, [imageRef, manualLocation, apiResult]); 

  
  // --- (THIS FUNCTION IS UPDATED) ---
  const handleFinalSubmit = async () => {
    if (!apiResult || !manualLocation) {
      setError("Cannot submit: Location is missing.");
      return;
    }
    if (!apiResult.pothole_detected) {
      console.log("Submitting as a manual report (no AI detection).")
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // The backend now returns the full report details
      const result = await submitFinalReport(imageRef.current, manualLocation, apiResult.detections);
      
      // --- (THIS IS THE CHANGE) ---
      // Navigate to the new success page and pass the report data
      navigate('/success', { 
        state: {
          report: result.data, // This contains ward_name, image_url, etc.
          location: manualLocation // This contains lat, lng
        } 
      });
      // --- (END OF CHANGE) ---

    } catch (err) {
      setError(err.response?.data?.detail || "Failed to submit the report.");
      setIsSubmitting(false);
    }
  };
  // --- (END OF UPDATED FUNCTION) ---

  if (!imageRef.current) {
    return (
      <div className="card" style={{ maxWidth: '600px', margin: '2rem auto' }}>
        <LoadingSpinner />
      </div>
    );
  }

  const initialPosition = manualLocation ? [manualLocation.lat, manualLocation.lng] : [12.9716, 77.5946]; 

  return (
    <div className="report-review-page">
      {(isLoading || isSubmitting) && (
        <div className="spinner-overlay" style={{ borderRadius: 0 }}>
          <div className="spinner" />
        </div>
      )}
      
      <h2>Review Your Report</h2>
      <p style={{textAlign: 'center', fontStyle: 'italic', color: '#333', marginTop: 0}}>
        Drag the pin to the exact location.
      </p>
      <DetectionViewer imageDataUrl={imageRef.current} detections={apiResult ? apiResult.detections : []} />

      {apiResult ? (
        <div className="submission-result" style={{ marginTop: '1rem' }}>
          <p>{apiResult.message}</p>
        </div>
      ) : (
         <p style={{ marginTop: '1rem' }}>Analyzing image for potholes...</p>
      )}

      {!manualLocation && (
        <p className="map-prompt">Please click on the map to pinpoint the pothole's location.</p>
      )}

      <MapContainer center={initialPosition} zoom={16} scrollWheelZoom={false} className="map-container">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ChangeView center={initialPosition} zoom={16} />
        <LocationMarker position={manualLocation} setPosition={setManualLocation} />
      </MapContainer>

      {manualLocation && <LocationDisplay latitude={manualLocation.lat} longitude={manualLocation.lng} accuracy={manualLocation.accuracy} />}
      
      {error && <p className="error-text">{error}</p>}
      
      {/* We no longer need the submitMessage here */}

      <div className="actions" style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
        <Button 
          onClick={handleFinalSubmit} 
          disabled={!apiResult || isSubmitting} // Simplified disabled logic
        >
          {isSubmitting ? "Submitting..." : "Submit Report"}
        </Button>

        <Button 
          onClick={() => navigate('/home')} 
          variant="secondary"
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
};

export default ReportReview;