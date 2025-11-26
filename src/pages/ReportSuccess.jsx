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
      <h2 style={{ textAlign: 'center', color: '#00703C' }}>✅ Report Submitted!</h2>
      <p style={{ textAlign: 'center', color: '#666' }}>
        Thank you! Your report has been successfully created.
      </p>

      <div className="success-page__details" style={{ marginTop: '1.5rem' }}>
        
        {/* --- FIX: Use standard Image tag (Backend sends processed image) --- */}
        {report.image_url ? (
          <img 
            src={report.image_url} 
            alt="Report Evidence" 
            style={{ 
              width: '100%', 
              borderRadius: '8px', 
              marginBottom: '1rem',
              border: '1px solid #ddd',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }} 
            onError={(e) => {
              e.target.onerror = null; 
              e.target.src = "https://via.placeholder.com/600x400?text=Image+Load+Error";
            }}
          />
        ) : (
          <div style={{ padding: '2rem', textAlign: 'center', background: '#eee', marginBottom: '1rem' }}>
            No Image Available
          </div>
        )}
        {/* --------------------------------------------------------------- */}

        <h3>Report Details:</h3>

        <ul style={{ listStyleType: 'none', padding: 0, margin: 0, fontSize: '0.95rem' }}>
          <li style={{ marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid #eee' }}>
            <strong>Report ID:</strong><br />
            <span style={{ fontFamily: 'monospace', color: '#555' }}>{report.report_id}</span>
          </li>
          <li style={{ marginBottom: '0.75rem' }}>
            <strong>Ward / Area:</strong><br />
            <span>{report.ward_name || "Unknown Area"}</span>
          </li>
          <li style={{ marginBottom: '0.75rem' }}>
            <strong>Full Address:</strong><br />
            <span style={{ fontSize: '0.9rem', color: '#555' }}>{report.full_address || "Unknown Address"}</span>
          </li>
          <li style={{ marginBottom: '0.75rem' }}>
            <strong>Problem(s) Reported:</strong><br />
            <span style={{ textTransform: 'capitalize', fontWeight: 'bold', color: report.problem_types?.includes('Manual') ? '#555' : '#D8000C' }}>
              {report.problem_types ? report.problem_types.join(', ') : 'Manual Report'}
            </span>
          </li>
          <li>
            <strong>GPS Location:</strong>
            <LocationDisplay latitude={location.lat} longitude={location.lng} />
          </li>
        </ul>

        <div style={{ height: '200px', marginTop: '1rem', borderRadius: '8px', overflow: 'hidden' }}>
          <MapContainer center={mapPosition} zoom={16} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={mapPosition}>
              <Popup>Report Location</Popup>
            </Marker>
            <ChangeView center={mapPosition} zoom={16} />
          </MapContainer>
        </div>
      </div>

      <Button
        onClick={() => navigate('/home')}
        style={{ width: '100%', marginTop: '2rem' }}
      >
        Report Another Issue
      </Button>
    </div>
  );
};

export default ReportSuccess;