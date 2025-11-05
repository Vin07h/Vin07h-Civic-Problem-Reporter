import React from 'react';
import PropTypes from 'prop-types';

/**
 * Displays latitude and longitude coordinates.
 * @param {object} props - The component props.
 * @param {number} props.latitude - The latitude.
 * @param {number} props.longitude - The longitude.
 * @param {number} [props.accuracy] - The accuracy of the reading in meters.
 */
const LocationDisplay = ({ latitude, longitude, accuracy }) => {
  return (
    <div className="location-display" style={{ fontSize: '0.9rem', color: '#555', marginTop: '0.5rem' }}>
      <p style={{ margin: 0 }}>Latitude: {latitude.toFixed(6)}</p>
      <p style={{ margin: 0 }}>Longitude: {longitude.toFixed(6)}</p>
      {accuracy && <p style={{ margin: 0 }}>Accuracy: {accuracy.toFixed(0)} meters</p>}
    </div>
  );
};

LocationDisplay.propTypes = {
  latitude: PropTypes.number.isRequired,
  longitude: PropTypes.number.isRequired,
  accuracy: PropTypes.number,
};

export default LocationDisplay;