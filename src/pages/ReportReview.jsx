import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap, Popup } from 'react-leaflet';
import Button from '../components/shared/Button';
import LocationDisplay from '../components/shared/LocationDisplay';
import { compressImage } from '../utils/helpers';
import { sendImageForDetection, submitFinalReport } from '../services/apiService';
import DetectionViewer from '../components/shared/DetectionViewer';
import LoadingSpinner from '../components/shared/LoadingSpinner';

// Helper components...
function ChangeView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, zoom);
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
  const eventHandlers = useMemo(() => ({
    dragend() {
      const marker = markerRef.current;
      if (marker != null) {
        const { lat, lng } = marker.getLatLng();
        setPosition({ lat, lng, accuracy: position?.accuracy || null });
      }
    },
  }), [position, setPosition]);

  if (!position) return null;
  return (
    <Marker draggable={true} eventHandlers={eventHandlers} position={[position.lat, position.lng]} ref={markerRef}>
      <Popup>Drag me to the exact spot</Popup>
    </Marker>
  );
}

const ReportReview = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const initialData = location.state || JSON.parse(sessionStorage.getItem('reportData'));

  const imageRef = useRef(initialData?.image);
  const locationRef = useRef(initialData?.location);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [apiResult, setApiResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // FIX: Detection Logic
  useEffect(() => {
    // Only run if we have an image and NO result/error yet.
    if (!imageRef.current || apiResult || error) return;
    
    // Note: Removed 'manualLocation' from dependency to prevent re-running AI when user moves the pin.
    
    const runDetection = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const compressed = await compressImage(imageRef.current, 800, 0.7);
        // We pass the location available at start, but detection relies mostly on image
        const result = await sendImageForDetection(compressed, manualLocation || {lat:0, lng:0});
        setApiResult(result.data);
      } catch (err) {
        console.error("Detection error:", err);
        // We set error, but we will allow the user to override and submit manually below
        setError("AI Analysis failed. You can still submit this report manually.");
      } finally {
        setIsLoading(false);
      }
    };
    runDetection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageRef]); 

  const handleFinalSubmit = async () => {
    if (!manualLocation) {
      setError("Cannot submit: Location is missing.");
      return;
    }

    setIsSubmitting(true);
    // Clear previous error to show we are trying
    setError(null);

    try {
      const compressedImage = await compressImage(imageRef.current, 1080, 0.8);
      
      // If apiResult exists, use its detections. If not (AI failed), send empty list.
      const detections = apiResult?.detections || [];
      
      const result = await submitFinalReport(compressedImage, manualLocation, detections);

      sessionStorage.removeItem('reportData');

      navigate('/success', {
        state: {
          report: result.data,
          location: manualLocation
        }
      });

    } catch (err) {
      setError(err.response?.data?.detail || "Failed to submit the report.");
      setIsSubmitting(false);
    }
  };
  
  const handleCancel = () => {
    sessionStorage.removeItem('reportData');
    navigate('/home');
  };

  const handleRetryAnalysis = () => {
    setError(null);
    setApiResult(null);
    // This resets state so the useEffect above runs again
  };

  if (!imageRef.current) return <LoadingSpinner />;

  const initialPosition = manualLocation ? [manualLocation.lat, manualLocation.lng] : [12.9716, 77.5946];

  return (
    <div className="report-review-page max-w-3xl mx-auto p-4">
      {(isLoading || isSubmitting) && (
        <div className="spinner-overlay"><div className="spinner" /></div>
      )}

      <h2 className="text-xl font-bold text-center mb-2">Review Your Report</h2>
      
      <DetectionViewer imageDataUrl={imageRef.current} detections={apiResult ? apiResult.detections : []} />

      {apiResult && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-center text-blue-800">
          <p>{apiResult.message}</p>
        </div>
      )}
      
      {isLoading && !apiResult && (
         <p className="text-center mt-4">Analyzing image for problems...</p>
      )}

      <div className="mt-4">
        <p className="text-center italic text-gray-600 mb-2">Drag the pin to the exact location.</p>
        <MapContainer center={initialPosition} zoom={16} scrollWheelZoom={false} style={{ height: '300px', borderRadius: '8px' }}>
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ChangeView center={initialPosition} zoom={16} />
          <LocationMarker position={manualLocation} setPosition={setManualLocation} />
        </MapContainer>
      </div>

      {manualLocation && (
        <div className="mt-2 text-center">
            <LocationDisplay latitude={manualLocation.lat} longitude={manualLocation.lng} accuracy={manualLocation.accuracy} />
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded text-center">
          <p className="text-red-700 font-medium mb-2">{error}</p>
          {/* Only show retry if we don't have a result yet */}
          {!apiResult && (
             <Button onClick={handleRetryAnalysis} variant="secondary">Retry Analysis</Button>
          )}
        </div>
      )}

      <div className="actions mt-6 flex justify-center gap-4">
        {/* FIX: Enable button even if there is an error (Fallback to manual) */}
        <Button 
          onClick={handleFinalSubmit} 
          disabled={isSubmitting || !manualLocation}
        >
          {error ? "Submit Manually" : (isSubmitting ? "Submitting..." : "Submit Report")}
        </Button>

        <Button 
          onClick={handleCancel} 
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