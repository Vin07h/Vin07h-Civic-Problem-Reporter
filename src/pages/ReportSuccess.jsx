import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Button from '../components/shared/Button';
import LocationDisplay from '../components/shared/LocationDisplay';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';

// Helper component to center the map
function ChangeView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);
  return null;
}

const ReportSuccess = () => {
  const navigate = useNavigate();
  const { state } = useLocation();

  // (FIX) If the user refreshes this page, state will be lost.
  // Redirect them to the home page so the app doesn't crash.
  useEffect(() => {
    if (!state) {
      navigate('/home');
    }
  }, [state, navigate]);

  // If state is null, we're about to redirect
  if (!state) {
    return null; 
  }

  const { report, location } = state;
  const mapPosition = [location.lat, location.lng];

  return (
    <div className="success-page card" style={{ maxWidth: '600px', margin: '2rem auto', textAlign: 'left' }}>
      <h2 style={{ textAlign: 'center' }}>✅ Report Submitted!</h2>
      <p style={{ textAlign: 'center' }}>
        Thank you! Your report has been successfully created.
      </p>

      <div className="success-page__details">
        <img src={report.image_url} alt="Submitted pothole" style={{ width: '100%', borderRadius: '8px', marginBottom: '1rem' }} />
        
        <h3>Report Details:</h3>
        
        <p style={{ marginBottom: '1rem' }}>
          <strong>Report ID:</strong><br />
          <span style={{ fontSize: '0.9rem', color: '#555' }}>{report.report_id}</span>
        </p>
        
        <p style={{ marginBottom: '1rem' }}>
          <strong>Ward / Area:</strong><br />
          {report.ward_name}
        </p>
        
        <p style={{ marginBottom: '1rem' }}>
          <strong>Full Address:</strong><br />
          {report.full_address}
        </p>

        <p><strong>Final Location:</strong></p>
        <LocationDisplay latitude={location.lat} longitude={location.lng} />

        <MapContainer center={mapPosition} zoom={16} scrollWheelZoom={false} className="map-container" style={{ height: '200px', marginTop: '1rem' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={mapPosition}>
            <Popup>The reported location</Popup>
          </Marker>
          <ChangeView center={mapPosition} zoom={16} />
        </MapContainer>
      </div>

      <Button 
        onClick={() => navigate('/home')} 
        style={{ width: '100%', marginTop: '2rem' }}
      >
        Report Another Pothole
      </Button>
    </div>
  );
};

export default ReportSuccess;