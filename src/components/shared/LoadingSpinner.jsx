import React from 'react';

/**
 * A simple loading spinner component with an overlay.
 */
const LoadingSpinner = () => {
  return (
    <div className="spinner-overlay">
      <div className="spinner" />
    </div>
  );
};

export default LoadingSpinner;