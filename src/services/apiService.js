import axios from 'axios';

// Use the environment variable, with a fallback
const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Sends a base64 encoded image to the backend for detection.
 * @param {string} imageBase64 The compressed image as a base64 string.
 * @param {{lat: number, lng: number}} location The location object.
 * @returns {Promise<any>} A promise that resolves with the API response.
 */
export const sendImageForDetection = (imageBase64, location) => {
  const payload = { image: imageBase64, latitude: location.lat, longitude: location.lng };
  return apiClient.post('/vision/detect', payload);
};

/**
 * Submits the final confirmed report to the backend.
 * @param {string} fullImageDataUrl The *original* (uncompressed) base64 data URL.
 * @param {{lat: number, lng: number}} location The confirmed location.
 * @param {Array} detections The array of detected bounding boxes.
 * @returns {Promise<any>} A promise that resolves with the final API response.
 */
export const submitFinalReport = (fullImageDataUrl, location, detections) => {
  const payload = {
    image: fullImageDataUrl,
    location: location,
    detections: detections,
  };
  return apiClient.post('/report/submit', payload);
};