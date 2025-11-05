import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

/**
 * A layout component that provides a consistent header
 * and card-based wrapper for all pages in the app.
 */
function Layout() {
  const location = useLocation();
  const navigate = useNavigate();

  // Don't show the main header on the Onboarding (welcome) page
  const showHeader = location.pathname !== '/';

  return (
    <div className="app-container">
      
      {/* Conditionally show the header */}
      {showHeader && (
        <header className="app-header">
          {/* Make the header clickable to go home */}
          <h1 onClick={() => navigate('/home')} style={{ cursor: 'pointer' }}>
            Civic Problem Reporter
          </h1>
        </header>
      )}

      <main>
        {/* This wraps all pages (Home, ReportReview, etc.) in your
          '.card' style for a consistent, centered look.
        */}
        <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <Outlet /> {/* This is where the page content will be rendered */}
        </div>
      </main>
    </div>
  );
}

export default Layout;