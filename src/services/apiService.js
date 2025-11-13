import axios from 'axios';

// Get the backend URL from environment variables, with a fallback
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * (Step 1) Sends the image and location to the backend for AI detection.
 * @param {string} base64Image - The base64-encoded image string.
 * @param {object} location - An object with { lat, lng }.
 * @returns {Promise<object>} The API response with detection results.
 */
export const sendImageForDetection = (base64Image, location) => {
  return axios.post(`${API_URL}/vision/detect`, {
    image: base64Image,
    latitude: location.lat,
    longitude: location.lng,
  });
};

/**
 * (Step 2) Submits the final, confirmed report to the backend.
 * @param {string} base64Image - The base64-encoded image string.
 * @param {object} location - An object with { lat, lng }.
 * @param {Array<object>} detections - The list of confirmed detections.
 *Next, upload your `App.js` file. @returns {Promise<object>} The API response with the final report details.
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

// --- ================================== ---
// ---       ** NEW ADMIN FUNCTIONS ** ---
// --- ================================== ---

/**
 * Fetches all reports from the database for the admin dashboard.
 * @returns {Promise<object>} The API response with a list of all reports.
 */
export const getAdminReports = () => {
  return axios.get(`${API_URL}/admin/reports`);
};

/**
 * Updates the status of a specific report.
 * @param {string} reportId - The MongoDB ID of the report.
 * @param {string} newStatus - The new status (e.g., "in-progress", "resolved").
 * @returns {Promise<object>} The API response with the updated report.
 */
export const updateReportStatus = (reportId, newStatus) => {
  return axios.patch(`${API_URL}/admin/report/${reportId}`, {
    status: newStatus,
  });
};