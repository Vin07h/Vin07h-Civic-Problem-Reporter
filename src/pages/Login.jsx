import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import authService from '../services/authService.js';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialRole = location.state?.role || 'civilian';
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loginType, setLoginType] = useState(initialRole); 

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
      const actualRole = profile?.role || 'civilian';

      if (loginType === 'admin') {
        if (actualRole !== 'admin') {
          setError('Access Denied: You are not an Admin.');
          authService.logout();
          return;
        }
        navigate('/admin');
      } else {
        navigate('/home');
      }
    } catch (err) {
      console.error(err);
      setError('Invalid email or password.');
    }
  };

  return (
    <div className="app-container" style={{ justifyContent: 'center' }}>
      <div className="auth-page">
        <h2 className="text-center">Login</h2>
        <p className="text-center" style={{ marginBottom: '1.5rem', color: '#666' }}>
          Portal Access: <strong>{loginType.toUpperCase()}</strong>
        </p>

        {error && <div className="error-text">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          {/* Email Group */}
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className="form-input" 
              required
              placeholder="name@example.com"
            />
          </div>

          {/* Password Group */}
          <div className="form-group">
             <label className="form-label">Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              className="form-input" 
              required
              placeholder="Enter your password"
            />
          </div>

          <div className="form-actions">
            <button 
              type="submit" 
              className="btn btn--primary btn-block"
            >
              Login
            </button>
          </div>
        </form>
        
        <div className="form-footer">
          <p>Don't have an account? <Link to="/signup">Sign up here</Link></p>
          <div style={{ marginTop: '0.5rem' }}>
            <Link to="/" style={{ fontSize: '0.8rem', color: '#999', textDecoration: 'none' }}>← Back to Selection</Link>
          </div>
        </div>
      </div>
    </div>
  );
}