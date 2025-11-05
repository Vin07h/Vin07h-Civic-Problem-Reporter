import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/shared/Button';

const Onboarding = () => {
  const navigate = useNavigate();

  const handleStart = () => {
    // In a real app, you might request permissions here first.
    // For now, we'll navigate directly to the home page.
    navigate('/home');
  };

  return (
    <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
              <h2>Welcome to Civic Problem Reporter</h2>      <p>Help make our roads safer by reporting potholes quickly and easily.</p>
      <div style={{ marginTop: '1.5rem' }}>
        <Button onClick={handleStart}>Get Started</Button>
      </div>
    </div>
  );
};

export default Onboarding;