import React from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';

/**
 * A layout component that provides a consistent header
 * and card-based wrapper for all pages in the app.
 *
 * It now accepts 'children' as a prop.
 */
function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();

  // Don't show the main header on the Onboarding (welcome) page
  const showHeader = location.pathname !== '/';
  
  // --- USER FLOW FIX ---
  // Clears session storage on header click to prevent stale data
  const handleHeaderClick = () => {
    sessionStorage.removeItem('reportData');
    navigate('/home');
  };
  // Make the entire header area clickable (prevents small dead zones)
  const headerProps = { onClick: handleHeaderClick, style: { cursor: 'pointer' }, role: 'button', tabIndex: 0 };
  // --- END FIX ---

  const { user, handleLogout } = useAuth();

  const onLogout = async (e) => {
    e.stopPropagation();
    try {
      await handleLogout();
      navigate('/login');
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  return (
    <div className="app-container">

      {/* Conditionally show the header */}
      {showHeader && (
        <header className="app-header" {...headerProps}>
          <h1 style={{ margin: 0 }}>
            Civic Problem Reporter
          </h1>

          {/* Auth actions top-right. Stop propagation so header click isn't triggered. */}
          <div style={{ position: 'absolute', right: 16, top: 12, display: 'flex', gap: 8 }}>
            {!user ? (
              <>
                <Link to="/login" onClick={(e) => e.stopPropagation()}>
                  <button className="px-3 py-1 bg-blue-600 text-white rounded">Login</button>
                </Link>
                <Link to="/signup" onClick={(e) => e.stopPropagation()}>
                  <button className="px-3 py-1 bg-green-600 text-white rounded">Sign up</button>
                </Link>
              </>
            ) : (
              <button onClick={onLogout} className="px-3 py-1 bg-red-600 text-white rounded">Logout</button>
            )}
          </div>
        </header>
      )}

      <main>
        {/* This wraps all pages (Home, ReportReview, etc.) in your
          '.card' style for a consistent, centered look.
        */}
        <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
          {children}
        </div>
      </main>
    </div>
  );
}

export default Layout;