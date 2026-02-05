import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Download, Eye, ChevronRight, X, Clock, FileText, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import apiService from '../services/apiService';
import { formatDisplayDate } from '../utils/dateUtils';
import './Admin.css';

const AdminReports = () => {
  const [fromDate, setFromDate] = useState('2026-01-01');
  const [toDate, setToDate] = useState('2026-01-31');
  const [status, setStatus] = useState('Approved');
  const [reportData, setReportData] = useState([]);
  const [stats, setStats] = useState({
    total_hours: 0,
    approved: 0,
    pending: 0,
    rejected: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Detail Modal State
  const [selectedReport, setSelectedReport] = useState(null);
  const [details, setDetails] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        from_date: fromDate,
        to_date: toDate,
        status: status
      };
      
      const statsParams = {
        from_date: fromDate,
        to_date: toDate
      };

      // Sequentially to catch specific failing one
      let reports = [];
      try {
        reports = await apiService.get('/admin/reports/filtered', params);
      } catch (err) {
        throw new Error(`[REPORTS_FILTER]: ${err.message}`);
      }

      let statsData = null;
      try {
        statsData = await apiService.get('/admin/reports/stats', statsParams);
      } catch (err) {
        throw new Error(`[REPORTS_STATS]: ${err.message}`);
      }
      
      setReportData(reports || []);
      setStats(statsData || {
        total_hours: 0,
        approved: 0,
        pending: 0,
        rejected: 0
      });
    } catch (err) {
      console.error('Diagnostic error:', err);
      setError(`[v4_DIAGNOSTIC]: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, status]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleViewDetails = async (report) => {
    setSelectedReport(report);
    setDetailsLoading(true);
    setDetails([]);
    try {
      const data = await apiService.get('/timesheets/week', { 
        email: report.email, 
        week_start_date: report.week_start_date 
      });
      setDetails(data || []);
    } catch (err) {
      console.error('Error fetching details:', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleDownload = () => {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const params = new URLSearchParams({
      from_date: fromDate,
      to_date: toDate,
      status: status
    });
    
    // Using window.location.href or a link to trigger browser download
    window.location.href = `${baseUrl}/admin/reports/download?${params.toString()}`;
  };

  return (
    <div className="reports-page animate-in">
      <div className="reports-header">
        <h2 className="page-title">Reports</h2>
        <p className="page-subtitle">Historical overview and detailed analytics for your team.</p>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="reports-content">
        {/* Summary Card */}
        <div className="report-card summary-card">
          <div className="summary-grid">
            <div className="summary-item">
              <span className="summary-label">Total Hours</span>
              <span className="summary-value highlight">{stats.total_hours.toLocaleString()}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Approved</span>
              <span className="summary-value highlight approved">{stats.approved.toLocaleString()}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Pending</span>
              <span className="summary-value highlight pending">{stats.pending.toLocaleString()}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Rejected</span>
              <span className="summary-value highlight rejected">{stats.rejected.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Filters Card */}
        <div className="report-card filter-card">
          <div className="filter-controls">
            <div className="date-field">
              <label>From</label>
              <input 
                type="date" 
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div className="date-field">
              <label>To</label>
              <input 
                type="date" 
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
            <div className="date-field">
              <label>Status</label>
              <select 
                className="status-select"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="Approved">Approved</option>
                <option value="Pending">Pending</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>
          <button 
            className="download-report-btn" 
            onClick={handleDownload}
            disabled={loading || reportData.length === 0}
          >
            <Download size={18} />
            Download
          </button>
        </div>

        {/* Details Table Card */}
        <div className="report-card details-card">
          <div className="details-header">
            <h3 className="card-title">{status} Reports</h3>
            <span className="results-count">{reportData.length} records found</span>
          </div>
          <div className="table-container">
            {loading ? (
              <div className="loading-spinner">Fetching data...</div>
            ) : reportData.length === 0 ? (
              <div className="no-data-message" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                No {status.toLowerCase()} reports found for the selected period.
              </div>
            ) : (
              <table className="reports-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>ID</th>
                    <th>Period</th>
                    <th>Status</th>
                    <th>Total Hours</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((row, index) => (
                    <tr key={index}>
                      <td className="emp-name-cell">{row.name}</td>
                      <td><span className="id-badge">{row.employee_id}</span></td>
                      <td>{row.week_start_date}</td>
                      <td>
                        <span className={`status-badge ${row.status.toLowerCase()}`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="hours-cell">{row.hours}</td>
                      <td>
                        <button className="view-link-btn" onClick={() => handleViewDetails(row)}>
                          View <ChevronRight size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Detail View Modal */}
      {selectedReport && (
        <div className="modal-overlay">
          <div className="modal-content report-detail-modal animate-in">
            <div className="modal-header">
              <div className="header-main">
                <FileText size={20} className="header-icon" />
                <h3>Report Details</h3>
              </div>
              <button className="close-btn" onClick={() => setSelectedReport(null)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="report-info-bar">
                <div className="info-block">
                  <span className="block-label">EMPLOYEE</span>
                  <span className="block-value">{selectedReport.name}</span>
                </div>
                <div className="info-block">
                  <span className="block-label">PERIOD</span>
                  <span className="block-value">{selectedReport.week_start_date}</span>
                </div>
                <div className="info-block">
                  <span className="block-label">TOTAL HOURS</span>
                  <span className="block-value highlight">{selectedReport.hours}</span>
                </div>
                <div className="info-block">
                  <span className="block-label">STATUS</span>
                  <span className={`status-badge ${selectedReport.status.toLowerCase()}`}>
                    {selectedReport.status}
                  </span>
                </div>
              </div>

              <div className="report-detail-table-wrap">
                {detailsLoading ? (
                  <div className="loading-spinner">Loading entries...</div>
                ) : (
                  <table className="details-expanded-table">
                    <thead>
                      <tr>
                        <th className="text-center">DATE</th>
                        <th className="text-center">HOURS</th>
                        <th className="text-center">PROJECT DESCRIPTION</th>
                        <th className="text-center">WORK TYPE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {details.map((entry, idx) => (
                        <tr key={idx}>
                          <td className="text-center">{formatDisplayDate(new Date(entry.date))}</td>
                          <td className="text-center hours-text">{Number(entry.hours)} hrs</td>
                          <td className="text-center project-text">{entry.task_description}</td>
                          <td className="text-center type-text">{entry.work_type}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
            
            <div className="modal-actions-bar">
              <button className="btn-secondary" onClick={() => setSelectedReport(null)}>Close View</button>
              <button className="btn-primary">
                <Download size={16} /> Export Week
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReports;
