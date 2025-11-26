import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/shared/Button';

const Landing = () => {
  const navigate = useNavigate();

  const handleSelection = (role) => {
    navigate('/login', { state: { role: role } });
  };

  return (
    <div className="landing-page">
      <h1>Civic Problem Reporter</h1>
      <p className="subtitle">
        Select your portal to continue.
      </p>
      
      <div className="portal-grid">
        {/* Civilian Card */}
        <div className="portal-card civilian-card">
          <h3>Civilian</h3>
          <p>
            Report infrastructure issues like potholes, or garbage to your local municipality.
          </p>
          <Button onClick={() => handleSelection('civilian')} variant="primary" className="btn-block">
            Civilian Login
          </Button>
        </div>

        {/* Admin Card */}
        <div className="portal-card admin-card">
          <h3>Administration</h3>
          <p>
            Official access for department officials to track, update, and resolve reported issues.
          </p>
          <Button onClick={() => handleSelection('admin')} variant="secondary" className="btn-block">
            Admin Login
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Landing;