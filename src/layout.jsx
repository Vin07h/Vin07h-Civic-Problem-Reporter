import React from 'react';
import { Outlet } from 'react-router-dom';

/**
 * A layout component that provides a consistent header
 * and wrapper for all pages in the app.
 */

function Layout() {
  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Civic Problem Reporter</h1>
      </header>
      <main>
        <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default Layout;