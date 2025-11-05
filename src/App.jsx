import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './layout'; // Import the layout
import Onboarding from './pages/Onboarding';
import Home from './pages/Home';
import ReportReview from './pages/ReportReview';
import ReportSuccess from './pages/ReportSuccess';

function App() {
  return (
    // All routes are now children of the main Layout
    <Layout>
      <Routes>
        <Route path="/" element={<Onboarding />} />
        <Route path="/home" element={<Home />} />
        <Route path="/report-review" element={<ReportReview />} />
        <Route path="/success" element={<ReportSuccess />} />
      </Routes>
    </Layout>
  );
}

export default App;