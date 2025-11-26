import React from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';

/**
 * Government Standard Layout
 * Enforces strict separation between Auth views and Content views.
 */
function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, handleLogout } = useAuth();

  // 1. Identify "Auth Pages" where we remove the outer styling wrapper
  // We explicitly include '/' (Landing) so it can manage its own layout
  const isAuthPage = ['/login', '/signup', '/'].includes(location.pathname);

  const handleHeaderClick = () => {
    sessionStorage.removeItem('reportData');
    navigate('/home');
  };

  const onLogout = async () => {
    try {
      await handleLogout();
      // 2. FIX: Redirect to Landing Page ('/') instead of Login
      navigate('/'); 
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="gov-header" style={{
        backgroundColor: '#003366',
        color: 'white',
        padding: '1rem',
        borderBottom: '4px solid #FFD100'
      }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          
          <div 
            onClick={handleHeaderClick} 
            style={{ cursor: 'pointer', fontWeight: 'bold', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '10px' }}
            role="button"
            tabIndex={0}
          >
            {/* Emblem */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
            <span>Civic Problem Reporter</span>
          </div>

          <nav>
            {!isAuthPage && (
              <>
                {user ? (
                  <button 
                    onClick={onLogout} 
                    className="btn btn--secondary" 
                    style={{ color: 'white', borderColor: 'white', padding: '0.4rem 1rem', fontSize: '0.9rem' }}
                  >
                    Logout
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <Link to="/login" style={{ color: 'white', textDecoration: 'none', fontWeight: 'bold' }}>Login</Link>
                    <Link to="/signup" style={{ color: '#FFD100', textDecoration: 'none', fontWeight: 'bold' }}>Sign Up</Link>
                  </div>
                )}
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="main-content">
        {/* Logic: If it's an Auth Page (like Landing), we DO NOT add the 'card' class.
           This allows the Landing page to render its own two separate cards.
        */}
        <div className={isAuthPage ? "auth-wrapper" : "card"}> 
          {children}
        </div>
      </main>

      <footer style={{ backgroundColor: '#F0F2F5', padding: '2rem', textAlign: 'center', borderTop: '1px solid #BFC1C2', marginTop: 'auto' }}>
        <p style={{ fontSize: '0.85rem', color: '#505A5F' }}>
          &copy; {new Date().getFullYear()} Civic Problem Reporter. Official G2C Service.
        </p>
      </footer>
    </div>
  );
}

export default Layout;