import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Button from '../components/shared/Button';
import LocationDisplay from '../components/shared/LocationDisplay';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import LoadingSpinner from '../components/shared/LoadingSpinner';

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

  useEffect(() => {
    if (!state) {
      navigate('/home');
    }
  }, [state, navigate]);

  if (!state) {
    return <LoadingSpinner />;
  }

  const { report, location } = state;
  const mapPosition = [location.lat, location.lng];

  return (
    <div style={{ textAlign: 'left' }}>
      <h2 style={{ textAlign: 'center' }}>✅ Report Submitted!</h2>
      <p style={{ textAlign: 'center' }}>
        Thank you! Your report has been successfully created.
      </p>

      <div className="success-page__details">
        <img src={report.image_url} alt="Submitted pothole" style={{ width: '100%', borderRadius: '8px', marginBottom: '1rem' }} />

        <h3>Report Details:</h3>

        {/* --- UI IMPROVEMENT --- */}
        <ul style={{ listStyleType: 'none', padding: 0, margin: 0 }}>
          <li style={{ marginBottom: '0.75rem' }}>
            <strong>Report ID:</strong><br />
            <span style={{ fontSize: '0.9rem', color: '#555', wordBreak: 'break-all' }}>{report.report_id}</span>
          </li>
          <li style={{ marginBottom: '0.75rem' }}>
            <strong>Ward / Area:</strong><br />
            <span>{report.ward_name}</span>
          </li>
          <li style={{ marginBottom: '0.75rem' }}>
            <strong>Full Address:</strong><br />
            <span>{report.full_address}</span>
          </li>
          <li style={{ marginBottom: '0.75rem' }}>
            <strong>Problem(s) Reported:</strong><br />
            <span style={{ textTransform: 'capitalize' }}>
              {report.problem_types ? report.problem_types.join(', ') : 'Manual Report'}
            </span>
          </li>
          <li>
            <strong>Final Location:</strong>
            <LocationDisplay latitude={location.lat} longitude={location.lng} />
          </li>
        </ul>
        {/* --- END IMPROVEMENT --- */}

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
        Report Another issue
      </Button>
    </div>
  );
};

export default ReportSuccess;