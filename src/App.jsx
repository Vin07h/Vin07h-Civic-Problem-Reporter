import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Layout from './layout';
import { useAuth } from './AuthContext.jsx';
import Onboarding from './pages/Onboarding';
import Home from './pages/Home';
import ReportReview from './pages/ReportReview';
import ReportSuccess from './pages/ReportSuccess';
import AdminDashboard from './pages/AdminDashboard';
import Login from './pages/Login';
import Signup from './pages/Signup';
import CivilianDashboard from './pages/CivilianDashboard';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Define paths where we DO NOT want the login overlay to appear
  const noOverlayPaths = ['/login', '/signup', '/onboarding', '/civilian', '/admin'];
  const shouldShowOverlay = !loading && !user && !noOverlayPaths.includes(location.pathname);

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/home" element={<Home />} />
        <Route path="/report-review" element={<ReportReview />} />
        <Route path="/success" element={<ReportSuccess />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Protected civilian dashboard */}
        <Route
          path="/civilian"
          element={
            <ProtectedRoute allowedRoles={['civilian']}>
              <CivilianDashboard />
            </ProtectedRoute>
          }
        />

        {/* Protected admin dashboard */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
      </Routes>

      {/* FIX: improved overlay logic. 
        Only show if not logged in AND not on a dedicated auth page.
      */}
      {shouldShowOverlay && (
        <div style={{ 
          position: 'fixed', 
          inset: 0, 
          background: 'rgba(0,0,0,0.6)', 
          backdropFilter: 'blur(4px)',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          zIndex: 60 
        }}>
          <div style={{ width: '100%', maxWidth: 500, margin: 20, position: 'relative' }}>
            {/* Optional: Add a close button or message here if needed */}
            <Login />
          </div>
        </div>
      )}
    </Layout>
  );
}

export default App;