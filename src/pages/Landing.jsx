import React from 'react';
import { useNavigate } from 'react-router-dom';

const Landing = () => {
  const navigate = useNavigate();

  const handleSelection = (role) => {
    // Navigate to login, passing the selected role in the "state"
    navigate('/login', { state: { role: role } });
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '80vh',
      textAlign: 'center'
    }}>
      <h1 className="text-3xl font-bold mb-8 text-blue-900">Civic Problem Reporter</h1>
      <p className="mb-8 text-gray-600">Please select your role to continue:</p>
      
      <div className="flex flex-col gap-4 w-full max-w-xs">
        {/* Civilian Button */}
        <button 
          onClick={() => handleSelection('civilian')}
          className="p-4 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 transition font-bold text-lg"
        >
          I am a Civilian
          <span className="block text-sm font-normal opacity-80">Report issues like potholes</span>
        </button>

        {/* Admin Button */}
        <button 
          onClick={() => handleSelection('admin')}
          className="p-4 bg-gray-800 text-white rounded-lg shadow-lg hover:bg-gray-900 transition font-bold text-lg"
        >
          I am an Admin
          <span className="block text-sm font-normal opacity-80">Manage and resolve reports</span>
        </button>
      </div>
    </div>
  );
};

export default Landing;
