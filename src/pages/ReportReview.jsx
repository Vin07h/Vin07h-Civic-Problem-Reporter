import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import Button from '../components/shared/Button';
import LocationDisplay from '../components/shared/LocationDisplay';
import { compressImage } from '../utils/helpers';
import { sendImageForDetection, submitFinalReport } from '../services/apiService';
import DetectionViewer from '../components/shared/DetectionViewer';

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
  const map = useMapEvents({
    click(e) {
      setPosition(e.latlng);
      map.flyTo(e.latlng, map.getZoom());
    },
  });
  if (!position) {
    return null;
  }
  return <Marker position={[position.lat, position.lng]}></Marker>;
}


const ReportReview = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { image, location: reportLocation } = location.state || {};
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [apiResult, setApiResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState(null);

  const getLeafletCompatibleLocation = (loc) => {
    if (!loc) return null;
    return { lat: loc.latitude || loc.lat, lng: loc.longitude || loc.lng };
  };

  const [manualLocation, setManualLocation] = useState(getLeafletCompatibleLocation(reportLocation));

  useEffect(() => {
    const runDetection = async () => {
      if (!image || !manualLocation) {
        if (!reportLocation) {
          setError("Please select a location on the map to begin analysis.");
        }
        return;
      }
      if(apiResult) return;

      setIsLoading(true);
      setError(null);
      try {
        const compressed = await compressImage(image, 800, 0.7);
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
  }, [image, manualLocation, apiResult]); 

  if (!image) {
    return (
      <div className="card" style={{ maxWidth: '600px', margin: '2rem auto' }}>
        <p>No image to review. Please start over.</p>
        <Button onClick={() => navigate('/home')}>Go Back</Button>
      </div>
    );
  }

  // --- (THIS FUNCTION IS UPDATED) ---
  const handleFinalSubmit = async () => {
    if (!apiResult || !apiResult.pothole_detected || !manualLocation) {
      setError("Cannot submit: No pothole detected or location is missing.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSubmitMessage(null);

    try {
      const result = await submitFinalReport(image, manualLocation, apiResult.detections);
      
      // Read the ward_name from the response
      const wardName = result.data.ward_name || "your area";
      setSubmitMessage(`Success! Report for ward '${wardName}' has been submitted.`);
      
      // Wait 3 seconds, then navigate home
      setTimeout(() => {
        navigate('/');
      }, 3000);

    } catch (err) {
      setError(err.response?.data?.detail || "Failed to submit the report.");
      setIsSubmitting(false);
    }
  };


  const initialPosition = manualLocation ? [manualLocation.lat, manualLocation.lng] : [12.9716, 77.5946];

  return (
    <div className="card report-review-page" style={{ maxWidth: '600px', margin: '2rem auto' }}>
      {(isLoading || isSubmitting) && (
        <div className="spinner-overlay" style={{ borderRadius: 0 }}>
          <div className="spinner" />
        </div>
      )}
      
      <h2>Review Your Report</h2>
      <DetectionViewer imageDataUrl={image} detections={apiResult ? apiResult.detections : []} />

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

      {manualLocation && <LocationDisplay latitude={manualLocation.lat} longitude={manualLocation.lng} />}
      
      {error && <p className="error-text">{error}</p>}
      
      {submitMessage && <p style={{ color: 'green', fontWeight: 'bold' }}>{submitMessage}</p>}

      <div className="submit-action" style={{ marginTop: '1rem' }}>
        <Button 
          onClick={handleFinalSubmit} 
          disabled={!apiResult || !apiResult.pothole_detected || isSubmitting || submitMessage}
        >
          {isSubmitting ? "Submitting..." : "Submit Final Report"}
        </Button>
      </div>
    </div>
  );
};

export default ReportReview;