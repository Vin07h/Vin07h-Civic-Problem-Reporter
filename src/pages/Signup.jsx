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

  // Decide role server-side (we still pass it, but only set to 'admin' if invite matches env)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      // Determine role: admin only if invite code matches the env var
      const expected = import.meta.env.VITE_ADMIN_INVITE_CODE || '';
      const role = inviteCode && inviteCode === expected ? 'admin' : 'civilian';

      // Warn if user attempted admin but code didn't match
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
    <div className="auth-page p-6 max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-4">Sign Up</h2>
      {error && <div className="mb-4 text-red-600">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="text" placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2 border rounded" />
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-2 border rounded" />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-2 border rounded" />

        <div>
          <label className="block text-sm font-medium text-gray-700">Admin invite code (optional)</label>
          <input
            type="text"
            placeholder="Enter admin invite code if you have one"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            className="w-full p-2 border rounded mt-1"
          />
          <p className="text-xs text-gray-500 mt-1">Do not enter an invite code unless you were explicitly invited to be an Admin. If code is invalid you will be created as a Civilian.</p>
        </div>

        <button type="submit" className="w-full p-2 bg-green-600 text-white rounded">Create account</button>
      </form>
      <p className="mt-4 text-sm">Already have an account? <Link to="/login" className="text-blue-600">Login</Link></p>
    </div>
  );
}
