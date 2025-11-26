import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import authService from '../services/authService.js';
import { useAuth } from '../AuthContext.jsx';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [preferredLanding, setPreferredLanding] = useState('auto');
  const navigate = useNavigate();
  const { user, anonymousDisabled } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const userObj = await authService.login({ email, password });

      if (preferredLanding === 'admin') {
        navigate('/admin');
        return;
      }
      if (preferredLanding === 'civilian') {
        navigate('/civilian');
        return;
      }

      const profile = await authService.getUserProfile(userObj.uid);
      if (profile && profile.role === 'admin') {
        navigate('/admin');
      } else if (profile && profile.role === 'civilian') {
        navigate('/civilian');
      } else {
        navigate('/home');
      }
    } catch (err) {
      setError(err.message || 'Failed to login');
    }
  };

  if (user && !user.isAnonymous) {
    return <div className="p-6 text-center">You are already logged in.</div>;
  }

  return (
    <div style={{ 
      minHeight: '80vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center' 
    }}>
      <div className="auth-page p-6 max-w-md w-full border rounded-lg shadow-lg bg-white">
        <h2 className="text-2xl font-bold mb-4 text-center">Login</h2>
        
        {anonymousDisabled && (
          <div className="mb-4 p-3 bg-yellow-100 border-l-4 border-yellow-400 text-yellow-700 text-sm">
            Anonymous sign-in disabled. Please log in.
          </div>
        )}
        
        {error && <div className="mb-4 p-2 bg-red-100 text-red-600 rounded text-sm">{error}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input 
              type="email" 
              placeholder="name@example.com" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" 
            />
          </div>
          
          <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" 
            />
          </div>

          <div className="mt-4 p-3 bg-gray-50 rounded text-sm">
            <span className="block font-semibold mb-2">I am a:</span>
            <div className="flex gap-4">
              <label className="cursor-pointer flex items-center">
                <input type="radio" name="landing" value="auto" checked={preferredLanding === 'auto'} onChange={() => setPreferredLanding('auto')} className="mr-1"/> 
                Auto
              </label>
              <label className="cursor-pointer flex items-center">
                <input type="radio" name="landing" value="admin" checked={preferredLanding === 'admin'} onChange={() => setPreferredLanding('admin')} className="mr-1"/> 
                Admin
              </label>
              <label className="cursor-pointer flex items-center">
                <input type="radio" name="landing" value="civilian" checked={preferredLanding === 'civilian'} onChange={() => setPreferredLanding('civilian')} className="mr-1"/> 
                Civilian
              </label>
            </div>
          </div>

          <button type="submit" className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded transition duration-200">
            Login
          </button>
        </form>
        
        <p className="mt-4 text-sm text-center text-gray-600">
          Don't have an account? <Link to="/signup" className="text-blue-600 font-semibold hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  );
}