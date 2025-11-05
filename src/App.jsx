import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Onboarding from './pages/Onboarding';
import Home from './pages/Home'
import ReportReview from './pages/ReportReview';
// (NEW) Import the new Success page
import ReportSuccess from './pages/ReportSuccess';

function App() {
  return (
    <div style={{ padding: '1rem' }}>
      <header style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1>Civic Problem Reporter</h1>
      </header>
      <Routes>
        <Route path="/" element={<Onboarding />} />
        <Route path="/home" element={<Home />} />
        <Route path="/report-review" element={<ReportReview />} />
        {/* (NEW) Add the route for the success page */}
        <Route path="/success" element={<ReportSuccess />} />
      </Routes>
    </div>
  );
}

export default App;