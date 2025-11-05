import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/shared/Button';

const Onboarding = () => {
  const navigate = useNavigate();

  const handleStart = () => {
    navigate('/home');
  };

  return (
    // (FIX) We remove the <div className="card"> wrapper 
    // because the Layout component provides it now.
    <>
      <h2>Welcome to Civic Problem Reporter</h2>
      <p>Help make our roads safer by reporting potholes quickly and easily.</p>
      <div style={{ marginTop: '1.5rem' }}>
        <Button onClick={handleStart}>Get Started</Button>
      </div>
    </>
  );
};

export default Onboarding;