import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import authService from '../services/authService.js';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // 1. Get the role passed from the Landing page (default to civilian if accessed directly)
  const initialRole = location.state?.role || 'civilian';
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loginType, setLoginType] = useState(initialRole); 

  // Update state if location changes
  useEffect(() => {
    if (location.state?.role) {
      setLoginType(location.state.role);
    }
  }, [location.state]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      const userObj = await authService.login({ email, password });
      const profile = await authService.getUserProfile(userObj.uid);
      
      // 2. Reroute Logic
      const actualRole = profile?.role || 'civilian';

      if (loginType === 'admin') {
        // If they clicked "Admin" but their account is "Civilian", block them
        if (actualRole !== 'admin') {
          setError('Access Denied: You are not an Admin.');
          authService.logout();
          return;
        }
        navigate('/admin'); // Admin Success -> Dashboard
      } else {
        navigate('/home'); // Civilian Success -> Reporting Camera
      }

    } catch (err) {
      console.error(err);
      setError('Invalid email or password.');
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto mt-10 border rounded shadow bg-white">
      <h2 className="text-2xl font-bold mb-2 text-center">Login</h2>
      <p className="text-center text-gray-500 mb-6">
        Logging in as <span className="font-bold uppercase text-blue-600">{loginType}</span>
      </p>

      {/* Hidden button to switch back to landing page if they made a mistake */}
      <div className="text-center mb-4">
        <Link to="/" className="text-sm text-gray-400 hover:text-gray-600">← Wrong role? Go back</Link>
      </div>

      {error && <div className="mb-4 p-2 bg-red-100 text-red-600 rounded text-sm text-center">{error}</div>}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input 
            type="email" value={email} onChange={(e) => setEmail(e.target.value)} 
            className="w-full p-2 border rounded mt-1" required
          />
        </div>
        <div>
           <label className="block text-sm font-medium text-gray-700">Password</label>
          <input 
            type="password" value={password} onChange={(e) => setPassword(e.target.value)} 
            className="w-full p-2 border rounded mt-1" required
          />
        </div>

        <button 
          type="submit" 
          className={`w-full py-2 px-4 text-white font-bold rounded ${loginType === 'admin' ? 'bg-gray-800 hover:bg-black' : 'bg-blue-600 hover:bg-blue-700'}`}
        >
          Login
        </button>
      </form>
      
      <p className="mt-4 text-sm text-center">
        Don't have an account? <Link to="/signup" className="text-blue-600 underline">Sign up</Link>
      </p>
    </div>
  );
}