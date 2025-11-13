import React, { useState, useEffect } from 'react';
import { getAdminReports, updateReportStatus } from '../services/apiService';
import './AdminDashboard.css'; // Make sure this CSS file exists

// Helper component for the status dropdown
const StatusSelect = ({ reportId, currentStatus, onStatusChange }) => {
  const [status, setStatus] = useState(currentStatus);

  const handleChange = (e) => {
    const newStatus = e.target.value;
    setStatus(newStatus);
    onStatusChange(reportId, newStatus);
  };

  return (
    <select value={status} onChange={handleChange} className={`status-select status-${status}`}>
      <option value="new">New</option>
      <option value="in-progress">In Progress</option>
      <option value="resolved">Resolved</option>
    </select>
  );
};

const AdminDashboard = () => {
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all reports when the component mounts
  useEffect(() => {
    const fetchReports = async () => {
      try {
        const response = await getAdminReports();
        // The backend sends `_id` but we modeled it as `id`
        // The new Pydantic model in main.py handles this, but let's be safe
        const formattedReports = response.data.map(report => ({
            ...report,
            id: report._id || report.id // Ensure we have a consistent 'id' field
        }));
        setReports(formattedReports);
      } catch (err) {
        setError('Failed to fetch reports. Are you logged in?');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchReports();
  }, []);

  // This function is called by the StatusSelect component
  const handleStatusChange = async (reportId, newStatus) => {
    try {
      // Call the API to update the status in the database
      const response = await updateReportStatus(reportId, newStatus);
      
      // Update the status in our local React state to match
      setReports((prevReports) =>
        prevReports.map((report) =>
          report.id === reportId ? { ...report, status: newStatus } : report
        )
      );
    } catch (err) {
      console.error('Failed to update status:', err);
      // If the API call fails, you might want to revert the <select>
      // For now, we'll just log the error
    }
  };

  if (isLoading) {
    return <div className="spinner-overlay"><div className="spinner" /></div>;
  }

  if (error) {
    return <div className="error-text" style={{ textAlign: 'center', padding: '2rem' }}>{error}</div>;
  }

  return (
    <div className="admin-dashboard">
      <h2>Admin Dashboard</h2>
      <p>Total Reports: {reports.length}</p>
      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Image</th>
              <th>Problem(s)</th>
              <th>Address / Ward</th>
              <th>Reported On</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => (
              <tr key={report.id}>
                <td data-label="Image">
                  <a href={report.image_url} target="_blank" rel="noopener noreferrer">
                    <img src={report.image_url} alt="Report" className="admin-table-img" />
                  </a>
                </td>
                <td data-label="Problem(s)" className="problem-types">
                  {report.problem_types.join(', ')}
                </td>
                <td data-label="Address">
                  <div className="address-cell">
                    <strong>{report.ward_name}</strong>
                    <span>{report.full_address}</span>
                  </div>
                </td>
                <td data-label="Reported On">
                  {new Date(report.created_at).toLocaleString()}
                </td>
                <td data-label="Status">
                  <StatusSelect
                    reportId={report.id}
                    currentStatus={report.status}
                    onStatusChange={handleStatusChange}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminDashboard;