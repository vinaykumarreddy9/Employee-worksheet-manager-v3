import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/apiService';
import './Admin.css';
import { Check, X, ChevronRight, ChevronDown, MessageSquare, Calendar } from 'lucide-react';
import { formatDisplayDate } from '../utils/dateUtils';
import AdminReports from './AdminReports';

export const AdminDashboard = () => {
  const getInitials = (name) => name ? name.charAt(0).toUpperCase() : '?';
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [details, setDetails] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [approveModal, setApproveModal] = useState(null); // Stores submission object to approve
  const [rejectModal, setRejectModal] = useState(null);   // Stores submission object to reject
  const [rejectReasonText, setRejectReasonText] = useState('');
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [stats, setStats] = useState({ pending: 0, total: 0 });

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const [data, statsData] = await Promise.all([
        apiService.get('/admin/submitted-weeks'),
        apiService.get('/admin/stats')
      ]);
      setSubmissions(data || []);
      setStats({
        pending: statsData.pending || 0,
        total: statsData.total || 0
      });
    } catch {
      setError('Failed to fetch submitted weeks.');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = async (sub) => {
    const id = `${sub.email}_${sub.week_start_date}`;
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }

    setExpandedId(id);
    if (!details[id]) {
      try {
        const data = await apiService.get('/timesheets/week', { 
          email: sub.email, 
          week_start_date: sub.week_start_date 
        });
        setDetails({ ...details, [id]: data });
      } catch {
        console.error('Failed to fetch details');
      }
    }
  };

  const confirmApprove = async () => {
    if (!approveModal) return;
    setLoading(true);
    try {
      await apiService.post('/admin/approve', {
        email: approveModal.email,
        week_start_date: approveModal.week_start_date
      }, { admin_email: user.email });
      
      setSubmissions(current => current.filter(s => 
        !(s.email === approveModal.email && s.week_start_date === approveModal.week_start_date)
      ));
      setApproveModal(null);
    } catch (err) {
      alert(`Failed to approve timesheet: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const confirmReject = async () => {
    if (!rejectModal) return;
    setLoading(true);
    try {
      await apiService.post('/admin/reject', {
        email: rejectModal.email,
        week_start_date: rejectModal.week_start_date,
        reason: rejectReasonText
      }, { admin_email: user.email });

      setSubmissions(current => current.filter(s => 
        !(s.email === rejectModal.email && s.week_start_date === rejectModal.week_start_date)
      ));
      setRejectModal(null);
      setRejectReasonText('');
    } catch (err) {
      alert(`Failed to reject timesheet: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-dashboard animate-in">
      {/* Top Portal Banner */}
      <div className="admin-portal-nav">
        <div className="portal-info">
          <div className="portal-logo">
            <img src="/logo.jpg" alt="Logo" className="portal-logo-img" />
          </div>
          <div className="portal-text">
            <span className="portal-label">ADMIN PORTAL</span>
            <h1 className="portal-title">Digiotai Solutions</h1>
          </div>
        </div>
        <div className="portal-tabs">
          <button 
            className={`portal-tab ${activeTab === 'Dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('Dashboard')}
          >
            Dashboard
          </button>
          <button 
            className={`portal-tab ${activeTab === 'Reports' ? 'active' : ''}`}
            onClick={() => setActiveTab('Reports')}
          >
            Reports
          </button>
        </div>
      </div>

      <div className="dashboard-content">
        {activeTab === 'Dashboard' ? (
          <>
            <div className="dashboard-main-header">
              <h2 className="page-title">Admin Dashboard</h2>
              <div className="stats-row">
                <div className="stat-pill stats-total">
                  Total: {stats.total} submissions
                </div>
                <div className="stat-pill stats-pending">
                  {stats.pending} pending approvals
                </div>
              </div>
            </div>

        {error && <div className="error-message">{error}</div>}

        {submissions.length === 0 && !loading ? (
          <div className="info-banner">
            👋 Currently, there are no timesheets awaiting review.
          </div>
        ) : (
          <div className="submissions-list-container">
            <div className="list-header">
              <h3 className="list-title">Pending Approvals</h3>
              <span className="count-bubble">{submissions.length}</span>
            </div>
            
            <div className="submissions-stack">
              {submissions.map((sub) => {
                const id = `${sub.email}_${sub.week_start_date}`;
                const isExpanded = expandedId === id;
                
                return (
                  <div key={id} className={`submission-card ${isExpanded ? 'active' : ''}`}>
                    <div className="card-summary" onClick={() => toggleExpand(sub)}>
                      <div className="card-main-info">
                        <div className="card-avatar">
                          {getInitials(sub.name)}
                        </div>
                        <div className="card-identity">
                          <h4 className="card-name">{sub.name}</h4>
                          <span className="card-id">ID: {sub.employee_id}</span>
                        </div>
                      </div>

                      <div className="card-meta">
                        <div className="meta-group">
                          <span className="meta-label">SUBMISSION PERIOD</span>
                          <div className="meta-date">
                            <Calendar size={16} />
                            <span>{sub.week_start_date}</span>
                          </div>
                        </div>
                      </div>

                      <div className="card-action-icon">
                        {isExpanded ? <ChevronDown size={22} /> : <ChevronRight size={22} />}
                      </div>
                    </div>

                {isExpanded && (
                  <div className="submission-details">
                    {details[id] ? (
                      <>
                        <table className="readonly-table">
                          <thead>
                            <tr>
                              <th>DATE</th>
                              <th>HOURS</th>
                              <th>PROJECT DESCRIPTION</th>
                              <th>WORK TYPE</th>
                            </tr>
                          </thead>
                          <tbody>
                            {details[id].map((entry, idx) => (
                              <tr key={idx}>
                                <td>{formatDisplayDate(new Date(entry.date))}</td>
                                <td>{entry.hours} hrs</td>
                                <td>
                                  {entry.task_description.includes(' - ') ? (
                                    <div className="table-desc-cell">
                                      <span className="desc-project">{entry.task_description.split(' - ')[0]}</span>
                                      <span className="desc-text">{entry.task_description.split(' - ')[1]}</span>
                                    </div>
                                  ) : (
                                    entry.task_description
                                  )}
                                </td>
                                <td>{entry.work_type === 'Billable' ? 'Regular Work' : entry.work_type}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>


                        <div className="admin-actions">
                          <button className="approve-btn" onClick={() => setApproveModal(sub)}>
                            <Check size={18} /> Approve Week
                          </button>
                          <button className="reject-btn" onClick={() => setRejectModal(sub)}>
                            <X size={18} /> Reject Week
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="loading-spinner">Loading details...</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    )}
          </>
        ) : (
          <AdminReports />
        )}
      </div>
      {/* Approve Confirmation Modal */}
      {approveModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-in">
            <div className="modal-header">
              <h3>Confirm Approval</h3>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to approve the timesheet for <strong>{approveModal.name}</strong> for the week of {approveModal.week_start_date}?</p>
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setApproveModal(null)}>Cancel</button>
              <button className="btn-confirm" onClick={confirmApprove} disabled={loading}>
                {loading ? 'Approving...' : 'Confirm Approval'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Confirmation Modal */}
      {rejectModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-in">
            <div className="modal-header">
              <h3>Reject Timesheet</h3>
            </div>
            <div className="modal-body">
              <p>Please provide a reason for rejecting the timesheet for <strong>{rejectModal.name}</strong>.</p>
              <textarea 
                className="modal-textarea"
                placeholder="Enter rejection reason..."
                value={rejectReasonText}
                onChange={(e) => setRejectReasonText(e.target.value)}
                autoFocus
              />
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => { setRejectModal(null); setRejectReasonText(''); }}>Cancel</button>
              <button 
                className="btn-reject-confirm" 
                onClick={confirmReject} 
                disabled={loading || !rejectReasonText.trim()}
              >
                {loading ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
