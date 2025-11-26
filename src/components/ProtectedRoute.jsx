import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="p-6">Loading...</div>;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If allowedRoles is empty, allow any authenticated user
  if (allowedRoles.length > 0) {
    const role = user.role || (user.email ? 'civilian' : 'guest');
    if (!allowedRoles.includes(role)) {
      // Redirect unauthorized users to home
      return <Navigate to="/" replace />;
    }
  }

  return children;
}
