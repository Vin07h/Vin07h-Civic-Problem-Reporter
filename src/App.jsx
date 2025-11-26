import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './layout';
import Landing from './pages/Landing'; // Import the new page
import Home from './pages/Home';
import ReportReview from './pages/ReportReview';
import ReportSuccess from './pages/ReportSuccess';
import AdminDashboard from './pages/AdminDashboard';
import Login from './pages/Login';
import Signup from './pages/Signup';
import CivilianDashboard from './pages/CivilianDashboard';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Layout>
      <Routes>
        {/* Step 1: Landing Page is now the default */}
        <Route path="/" element={<Landing />} />
        
        {/* Step 2: Auth Pages */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Step 3: Application Routes */}
        <Route path="/home" element={<Home />} />
        <Route path="/report-review" element={<ReportReview />} />
        <Route path="/success" element={<ReportSuccess />} />

        {/* Protected Route: Civilian */}
        <Route
          path="/civilian"
          element={
            <ProtectedRoute allowedRoles={['civilian', 'admin']}>
              <CivilianDashboard />
            </ProtectedRoute>
          }
        />

        {/* Protected Route: Admin */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Layout>
  );
}

export default App;