import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import authService from '../services/authService.js';

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const expected = import.meta.env.VITE_ADMIN_INVITE_CODE || '';
      const role = inviteCode && inviteCode === expected ? 'admin' : 'civilian';

      if (inviteCode && role !== 'admin') {
        setError('Invalid admin invite code. You will be created as a Civilian.');
      }

      await authService.register({ email, password, role, name });
      navigate('/login');
    } catch (err) {
      setError(err.message || 'Failed to register');
    }
  };

  return (
    // FIX: Center alignment wrapper
    <div style={{ 
      minHeight: '80vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center' 
    }}>
      <div className="auth-page p-6 max-w-md w-full border rounded-lg shadow-lg bg-white">
        <h2 className="text-2xl font-bold mb-4 text-center">Create Account</h2>
        
        {error && <div className="mb-4 p-2 bg-red-100 text-red-600 rounded text-sm">{error}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <input 
            type="text" 
            placeholder="Full name" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            className="w-full p-2 border rounded focus:ring-2 focus:ring-green-500 outline-none" 
          />
          <input 
            type="email" 
            placeholder="Email address" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            className="w-full p-2 border rounded focus:ring-2 focus:ring-green-500 outline-none" 
          />
          <input 
            type="password" 
            placeholder="Create password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            className="w-full p-2 border rounded focus:ring-2 focus:ring-green-500 outline-none" 
          />

          <div className="pt-2 border-t mt-2">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Admin Access (Optional)
            </label>
            <input
              type="text"
              placeholder="Invite Code"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              className="w-full p-2 border rounded bg-gray-50 focus:bg-white text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">Leave blank unless you are an administrator.</p>
          </div>

          <button type="submit" className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded transition duration-200">
            Sign Up
          </button>
        </form>
        
        <p className="mt-4 text-sm text-center text-gray-600">
          Already have an account? <Link to="/login" className="text-blue-600 font-semibold hover:underline">Login</Link>
        </p>
      </div>
    </div>
  );
}