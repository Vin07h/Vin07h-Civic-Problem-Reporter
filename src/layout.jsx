import React from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';

/**
 * Government Standard Layout
 * Responsive & Dynamic.
 */
function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, handleLogout } = useAuth();

  const isAuthPage = ['/login', '/signup', '/'].includes(location.pathname);

  const handleHeaderClick = () => {
    sessionStorage.removeItem('reportData');
    navigate('/home');
  };

  const onLogout = async () => {
    try {
      await handleLogout();
      navigate('/'); 
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  return (
    <div className="app-container">
      {/* Responsive Header Class */}
      <header className="gov-header">
        <div className="gov-header__inner">
          
          <div 
            className="gov-header__brand"
            onClick={handleHeaderClick} 
            role="button"
            tabIndex={0}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
            <span>Civic Problem Reporter</span>
          </div>

          <nav className="gov-header__nav">
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
                  <>
                    <Link to="/login">Login</Link>
                    <Link to="/signup" className="highlight">Sign Up</Link>
                  </>
                )}
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="main-content">
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