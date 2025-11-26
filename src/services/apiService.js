import axios from 'axios';

// FORCE the URL to localhost:8000 for development to ensure connection
const API_URL = 'http://localhost:8000'; 

/**
 * Sends the image and location to the backend for AI detection.
 */
export const sendImageForDetection = (base64Image, location) => {
  return axios.post(`${API_URL}/vision/detect`, {
    image: base64Image,
    latitude: location.lat,
    longitude: location.lng,
  });
};

/**
 * Submits the final, confirmed report to the backend.
 */
export const submitFinalReport = (base64Image, location, detections) => {
  return axios.post(`${API_URL}/report/submit`, {
    image: base64Image,
    location: {
      lat: location.lat,
      lng: location.lng,
    },
    detections: detections,
  });
};

// --- ADMIN FUNCTIONS ---

export const getAdminReports = () => {
  return axios.get(`${API_URL}/admin/reports`);
};

export const updateReportStatus = (reportId, newStatus) => {
  return axios.patch(`${API_URL}/admin/report/${reportId}`, {
    status: newStatus,
  });
};