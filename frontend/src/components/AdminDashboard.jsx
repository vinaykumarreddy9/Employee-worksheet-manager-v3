import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/apiService';
import './Admin.css';
import { Check, X, ChevronRight, ChevronDown, MessageSquare } from 'lucide-react';
import { formatDisplayDate } from '../utils/dateUtils';

export const AdminDashboard = () => {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [details, setDetails] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rejectionReason, setRejectionReason] = useState({});

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const data = await apiService.get('/admin/submitted-weeks');
      setSubmissions(data || []);
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

  const handleAction = async (sub, action, reason = '') => {
    setLoading(true);
    try {
      const path = action === 'approve' ? '/admin/approve' : '/admin/reject';
      const payload = {
        email: sub.email,
        week_start_date: sub.week_start_date,
        ...(action === 'reject' && { reason })
      };
      
      await apiService.post(path, payload, { admin_email: user.email });
      alert(`Week ${action === 'approve' ? 'Approved' : 'Rejected'}!`);
      setExpandedId(null);
      fetchSubmissions();
    } catch (err) {
      alert(`Action failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-dashboard animate-in">
      <div className="dashboard-header">
        <h2>Admin Review Dashboard</h2>
      </div>

      {error && <div className="error-message">{error}</div>}

      {submissions.length === 0 && !loading ? (
        <div className="info-banner">
          👋 Currently, there are no timesheets awaiting review.
        </div>
      ) : (
        <div className="submissions-list">
          <h3>Pending Reviews ({submissions.length})</h3>
          
          {submissions.map((sub) => {
            const id = `${sub.email}_${sub.week_start_date}`;
            const isExpanded = expandedId === id;
            
            return (
              <div key={id} className={`submission-item card ${isExpanded ? 'expanded' : ''}`}>
                <div className="submission-summary" onClick={() => toggleExpand(sub)}>
                  <div className="sub-info">
                    <strong>{sub.name}</strong>
                    <span className="sub-id">(ID: {sub.employee_id})</span>
                    <span className="sub-week">Week: {sub.week_start_date}</span>
                  </div>
                  {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
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
                                <td>{entry.task_description}</td>
                                <td>{entry.work_type === 'Billable' ? 'Regular Work' : entry.work_type}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        <div className="admin-actions">
                          <button className="approve-btn" onClick={() => handleAction(sub, 'approve')}>
                            <Check size={18} /> Approve Week
                          </button>
                          
                          <div className="rejection-box">
                            <div className="rejection-input-group">
                              <MessageSquare size={16} />
                              <textarea 
                                placeholder="Reason for Rejection..." 
                                value={rejectionReason[id] || ''}
                                onChange={(e) => setRejectionReason({...rejectionReason, [id]: e.target.value})}
                              />
                            </div>
                            <button 
                              className="reject-btn" 
                              disabled={!(rejectionReason[id] || '').trim()}
                              onClick={() => handleAction(sub, 'reject', rejectionReason[id])}
                            >
                              <X size={18} /> Confirm Reject
                            </button>
                          </div>
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
      )}
    </div>
  );
};
