import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import Button from '../components/shared/Button';
import LocationDisplay from '../components/shared/LocationDisplay';
import { compressImage } from '../utils/helpers';
import { sendImageForDetection } from '../services/apiService';
import DetectionViewer from '../components/shared/DetectionViewer';

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

  // Helper to ensure location object is in the {lat, lng} format Leaflet expects
  const getLeafletCompatibleLocation = (loc) => {
    if (!loc) return null;
    // It might already be in {lat, lng} format from a map click, or {latitude, longitude} from props
    return { lat: loc.latitude || loc.lat, lng: loc.longitude || loc.lng };
  };

  const [manualLocation, setManualLocation] = useState(getLeafletCompatibleLocation(reportLocation));

  // Automatically run detection when the component mounts
  useEffect(() => {
    const runDetection = async () => {
      // Don't run if we don't have an image or a location
      if (!image || !manualLocation) {
        if (!reportLocation) {
          setError("Please select a location on the map to begin analysis.");
        }
        return;
      }

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
  }, [image, manualLocation]);

  if (!image) {
    return (
      <div className="card" style={{ maxWidth: '600px', margin: '2rem auto' }}>
        <p>No image to review. Please start over.</p>
        <Button onClick={() => navigate('/home')}>Go Back</Button>
      </div>
    );
  }

  const handleFinalSubmit = () => {
    // Here you would send the final, confirmed report to another backend endpoint
    alert("Report has been submitted! (Simulation)");
    navigate('/');
  };

  const initialPosition = manualLocation ? [manualLocation.lat, manualLocation.lng] : [12.9716, 77.5946]; // Default to Bangalore

  return (
    <div className="card report-review-page" style={{ maxWidth: '600px', margin: '2rem auto' }}>
      {isLoading && <div className="spinner-overlay" style={{ borderRadius: 0 }}><div className="spinner" /></div>}
      <h2>Review Your Report</h2>
      <DetectionViewer imageDataUrl={image} detections={apiResult ? apiResult.detections : []} />

      {apiResult ? (
        <div className="submission-result">
          <h3>Submission Result</h3>
          <p>{apiResult.message}</p>
          <Button onClick={handleFinalSubmit}>Done</Button>
        </div>
      ) : (
      <>
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

      <div className="submit-action">
        <Button onClick={handleFinalSubmit} disabled={!apiResult || !apiResult.pothole_detected}>Submit Final Report</Button>
      </div>
      </>
      )}
    </div>
  );
};

export default ReportReview;