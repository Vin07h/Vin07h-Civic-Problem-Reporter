import axios from 'axios';

// Get the backend URL from environment variables.
const API_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:8000';

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

// --- NEW: CIVILIAN FUNCTIONS (Fixes Data Sync) ---

/**
 * Fetches reports submitted by a specific user from the backend.
 * @param {string} userId - The Firebase UID of the logged-in user.
 */
export const getUserReports = (userId) => {
  // Assuming your backend supports filtering by user_id
  // If not, you might need to add this endpoint to your FastAPI backend
  return axios.get(`${API_URL}/reports/user/${userId}`);
};