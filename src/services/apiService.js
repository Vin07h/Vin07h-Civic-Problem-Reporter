import axios from 'axios';

// Create an axios instance. In a real application, you would configure
// the baseURL to point to your backend server.
const apiClient = axios.create({
  baseURL: 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Sends a base64 encoded image to the backend for detection.
 * @param {string} imageBase64 The compressed image as a base64 data URL.
 * @param {{lat: number, lng: number}} location The location object.
 * @returns {Promise<any>} A promise that resolves with the API response.
 */
export const sendImageForDetection = (imageBase64, location) => {
  // The backend endpoint as per the plan is /vision/detect
  // We'll send the image data in a JSON payload.
  const payload = { image: imageBase64, latitude: location.lat, longitude: location.lng };
  return apiClient.post('/vision/detect', payload);
};