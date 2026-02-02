import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/apiService';
import './Dashboard.css';
import { Plus, Save, Send, AlertCircle, CheckCircle2, Clock, DollarSign, Briefcase, Calendar, ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { 
  getPastWeeks, 
  parsePeriodDate, 
  formatDateISO, 
  formatDisplayDate, 
  getWorkingDays 
} from '../utils/dateUtils';

export const EmployeeDashboard = () => {
  const { user } = useAuth();
  const [weeks, setWeeks] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState('');
  const [entries, setEntries] = useState([]);
  const [status, setStatus] = useState('New');
  const [rejectionReason, setRejectionReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [rowErrors, setRowErrors] = useState({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  useEffect(() => {
    const pastWeeks = getPastWeeks();
    setWeeks(pastWeeks);
    if (pastWeeks.length > 0) {
      setSelectedWeek(pastWeeks[0]);
    }
  }, []);

  useEffect(() => {
    if (selectedWeek) {
      fetchTimesheet();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWeek]);

  const fetchTimesheet = async () => {
    setLoading(true);
    setError('');
    try {
      const startDateStr = selectedWeek.split(' - ')[0];
      const startDate = parsePeriodDate(startDateStr);
      const isoDate = formatDateISO(startDate);
      
      const data = await apiService.get('/timesheets/week', { 
        email: user.email, 
        week_start_date: isoDate 
      });

      if (data && data.length > 0) {
        setEntries(data.map(entry => ({
          ...entry,
          displayDate: formatDisplayDate(new Date(entry.date))
        })));
        setStatus(data[0].status);
        setRejectionReason(data[0].rejection_reason || '');
      } else {
        const defaultDate = getWorkingDays(startDate)[0];
        setEntries([{
          date: formatDateISO(new Date(startDate.getTime() + 86400000)), // First Monday
          displayDate: defaultDate,
          hours: 8.0,
          task_description: '',
          work_type: 'Billable'
        }]);
        setStatus('New');
        setRejectionReason('');
      }
      setHasUnsavedChanges(false);
    } catch {
      setError('Failed to fetch timesheet data.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRow = () => {
    const lastEntry = entries[entries.length - 1];
    if (lastEntry && !lastEntry.task_description) {
      setRowErrors({ [entries.length - 1]: 'Enter description before adding a new row.' });
      return;
    }
    
    const startDateStr = selectedWeek.split(' - ')[0];
    const workingDays = getWorkingDays(parsePeriodDate(startDateStr));
    
    let defaultDisplayDate = workingDays[0];
    if (lastEntry) {
      // Calculate total hours for the date of the last entry
      const lastDateHours = entries
        .filter(e => e.displayDate === lastEntry.displayDate)
        .reduce((sum, e) => sum + parseFloat(e.hours || 0), 0);

      const lastDateIdx = workingDays.indexOf(lastEntry.displayDate);
      
      // If last date has 8 or more hours, suggest next day. Otherwise suggest same day.
      if (lastDateHours >= 8 && lastDateIdx < workingDays.length - 1) {
        defaultDisplayDate = workingDays[lastDateIdx + 1];
      } else {
        defaultDisplayDate = lastEntry.displayDate;
      }
    }

    const startDate = parsePeriodDate(startDateStr);
    const dayOffset = workingDays.indexOf(defaultDisplayDate) + 1;
    const actualDate = new Date(startDate);
    actualDate.setDate(startDate.getDate() + dayOffset);

    setEntries([...entries, {
      date: formatDateISO(actualDate),
      displayDate: defaultDisplayDate,
      hours: 8.0, // Default to 8.0h as requested
      task_description: '',
      work_type: 'Billable'
    }]);
    setRowErrors({});
    setHasUnsavedChanges(true); // Mark as unsaved
  };


  const handleEntryChange = (index, field, value) => {
    const newEntries = [...entries];
    
    if (field === 'hours') {
        const val = parseFloat(value);
        if (val > 8) value = "8.0";
        if (val < 0) value = "0.0";
    }

    newEntries[index][field] = value;
    
    if (field === 'work_type' && value === 'Holiday') {
        newEntries[index].hours = 8.0;
    }
    
    if (field === 'displayDate') {
      newEntries[index].displayDate = value;
      const startDateStr = selectedWeek.split(' - ')[0];
      const startDate = parsePeriodDate(startDateStr);
      const workingDays = getWorkingDays(startDate);
      const dayOffset = workingDays.indexOf(value) + 1;
      const actualDate = new Date(startDate);
      actualDate.setDate(startDate.getDate() + dayOffset);
      newEntries[index].date = formatDateISO(actualDate);
    }

    setEntries(newEntries);
    setRowErrors({});
    setError(''); // Clear global error banner
    setHasUnsavedChanges(true); // Mark as unsaved
  };

  const calculateHoursByWorkType = (type) => {
    return entries
      .filter(e => e.work_type === type)
      .reduce((sum, e) => sum + parseFloat(e.hours || 0), 0);
  };

  const calculateTotal = () => {
    return entries.reduce((sum, entry) => sum + parseFloat(entry.hours || 0), 0);
  };

  const handleSubmitClick = () => {
    setError('');
    
    if (hasUnsavedChanges) {
      setError('Please save your changes before submitting.');
      return;
    }

    const total = calculateTotal();
    if (total !== 40) {
      setError(`Cannot submit. Weekly total must be exactly 40.0h. Current: ${total}h`);
      return;
    }

    setShowSubmitModal(true);
  };

  const handleConfirmSubmit = async () => {
    setShowSubmitModal(false);
    await handleSave(true);
  };

  const handleSave = async (isSubmit = false) => {
    setLoading(true);
    setError('');
    
    // Prevent submitting unsaved changes (secondary check)
    if (isSubmit && hasUnsavedChanges) {
        setError('Please save your changes before submitting.');
        setLoading(false);
        return;
    }

    for (let i = 0; i < entries.length; i++) {
        if (!entries[i].task_description.trim()) {
            setRowErrors({ [i]: 'Description is required' });
            setError(`Row ${i+1} is missing a description.`);
            setLoading(false);
            return;
        }
    }

    const dailyTotals = {};
    for (const entry of entries) {
        dailyTotals[entry.displayDate] = (dailyTotals[entry.displayDate] || 0) + parseFloat(entry.hours);
    }

    for (const [day, total] of Object.entries(dailyTotals)) {
        if (total > 8) {
            setError(`Total hours for ${day} cannot exceed 8 hours (Current: ${total}h)`);
            setLoading(false);
            return;
        }
    }

    const total = calculateTotal();
    if (isSubmit && total !== 40) {
      setError(`Cannot submit. Weekly total must be exactly 40.0h. Current: ${total}h`);
      setLoading(false);
      return;
    }

    try {
      const startDateStr = selectedWeek.split(' - ')[0];
      const startDate = parsePeriodDate(startDateStr);
      
      const payload = {
        week_start_date: formatDateISO(startDate),
        entries: entries.map((entry) => {
          const { displayDate: _, ...rest } = entry;
          return {
            ...rest,
            hours: parseFloat(rest.hours)
          };
        })
      };

      const params = { email: user.email };
      if (isSubmit) params.status = 'Submitted';

      await apiService.post('/timesheets/save', payload, params);
      
      if (isSubmit) {
        setStatus('Submitted');
      } else {
        setSuccess('Draft saved successfully!');
        setHasUnsavedChanges(false); // Reset unsaved changes on successful save
        setTimeout(() => setSuccess(''), 3000);
      }
      if (isSubmit) fetchTimesheet(); // Only refetch on submit to update status
    } catch (err) {
      setError(err.message || 'Failed to communicate with server.');
    } finally {
      setLoading(false);
    }
  };

  const isReadonly = status === 'Submitted' || status === 'Approved';

  const handleWeekNav = (direction) => {
    const currentIndex = weeks.indexOf(selectedWeek);
    if (direction === 'prev' && currentIndex < weeks.length - 1) {
      setSelectedWeek(weeks[currentIndex + 1]);
    } else if (direction === 'next' && currentIndex > 0) {
      setSelectedWeek(weeks[currentIndex - 1]);
    }
  };

  return (
    <div className="dashboard animate-in">
      <div className="dashboard-header-container">
        <div className="dashboard-title-area">
          <h2>Employee Timesheet</h2>
          <p className="dashboard-subtitle">Review submitted hours for the selected week</p>
        </div>
        <div className="status-badge-container">
          {status === 'Submitted' && (
            <div className="badge-v2 submitted">
              <CheckCircle2 size={14} /> Submitted
            </div>
          )}
          {status === 'Approved' && (
            <div className="badge-v2 submitted">
              <CheckCircle2 size={14} /> Approved
            </div>
          )}
          {status === 'New' && (
            <div className="badge-v2 not-submitted">
              <Clock size={14} /> Not Submitted
            </div>
          )}
          {status === 'Denied' && (
            <div className="badge-v2" style={{background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca'}}>
              <AlertCircle size={14} /> Rejected
            </div>
          )}
        </div>
      </div>

      <div className="dashboard-top-actions">
        <div className="period-nav-container">
          <button className="nav-arrow" onClick={() => handleWeekNav('prev')} disabled={weeks.indexOf(selectedWeek) === weeks.length - 1}>
            <ChevronLeft size={18} />
          </button>
          <div className="period-display">
            <Calendar size={16} color="#3b82f6" />
            <select value={selectedWeek} onChange={(e) => setSelectedWeek(e.target.value)} disabled={loading}>
              {weeks.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>
          <button className="nav-arrow" onClick={() => handleWeekNav('next')} disabled={weeks.indexOf(selectedWeek) === 0}>
            <ChevronRight size={18} />
          </button>
        </div>


        <div className="stats-grid">

          <div className="stat-card">
            <div className="stat-icon icon-blue">
              <Clock size={18} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Total Hours</span>
              <span className="stat-value">{calculateTotal()} hrs</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon icon-green">
              <DollarSign size={18} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Billable</span>
              <span className="stat-value">{calculateHoursByWorkType('Billable')} hrs</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon icon-yellow">
              <Briefcase size={18} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Non-Billable</span>
              <span className="stat-value">{calculateTotal() - calculateHoursByWorkType('Billable')} hrs</span>
            </div>
          </div>
        </div>
      </div>

      <div className="weekly-entries-card">
        <div className="section-header">
          <h3>Weekly Entries</h3>
        </div>


        <div className="timesheet-card">
          <table className="timesheet-table">
            <thead>
              <tr>
                <th style={{width: '18%'}}>Date</th>
                <th style={{width: '42%'}}>Project / Description</th>
                <th style={{width: '15%'}}>Hours</th>
                <th style={{width: '15%'}}>Work Type</th>
                <th style={{width: '10%', textAlign: 'center'}}>Action</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, index) => {
                return (
                <tr key={index}>
                  <td>
                    {isReadonly ? (
                      <div className="table-date-cell">
                        <span className="date-day">
                          {new Date(entry.date).toLocaleDateString('en-GB', { weekday: 'long' })}
                        </span>
                        <span className="date-full">
                          {new Date(entry.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')}
                        </span>
                      </div>
                    ) : (
                      <select 
                        className="cell-input"
                        value={entry.displayDate}
                        onChange={(e) => handleEntryChange(index, 'displayDate', e.target.value)}
                        style={{ fontSize: '0.8rem', padding: '0.4rem' }}
                      >
                        {getWorkingDays(parsePeriodDate(selectedWeek.split(' - ')[0])).map(day => (
                          <option key={day} value={day}>{day}</option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td>
                    <div className="table-desc-cell">
                      {isReadonly ? (
                        entry.task_description.includes(' - ') ? (
                          <>
                            <span className="desc-project">{entry.task_description.split(' - ')[0]}</span>
                            <span className="desc-text">{entry.task_description.split(' - ')[1]}</span>
                          </>
                        ) : (
                          <span className="desc-project">{entry.task_description}</span>
                        )
                      ) : (
                        <>
                          <input 
                            className="cell-input"
                            placeholder="Project name - Task description..." 
                            value={entry.task_description}
                            onChange={(e) => handleEntryChange(index, 'task_description', e.target.value)}
                          />
                          {rowErrors[index] && <span className="row-error-hint">{rowErrors[index]}</span>}
                        </>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="table-hours-cell">
                      {isReadonly || entry.work_type === 'Holiday' ? (
                        <span>{entry.hours}</span>
                      ) : (
                        <input 
                          className="cell-input"
                          type="number" 
                          step="0.5" 
                          style={{width: '80px', textAlign: 'center'}}
                          value={entry.hours}
                          onChange={(e) => handleEntryChange(index, 'hours', e.target.value)}
                        />
                      )}
                    </div>
                  </td>
                  <td>
                    {isReadonly ? (
                      <span className="type-text">{entry.work_type}</span>
                    ) : (
                      <select 
                        className="cell-input"
                        value={entry.work_type}
                        onChange={(e) => handleEntryChange(index, 'work_type', e.target.value)}
                      >
                        <option value="Billable">Billable</option>
                        <option value="Holiday">Holiday</option>
                      </select>
                    )}
                  </td>
                  <td style={{textAlign: 'center'}}>
                    <div className="table-action-cell" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                      {isReadonly ? (
                        <div className="action-circle">
                          <Lock size={16} />
                        </div>
                      ) : (
                        <>
                          {index === entries.length - 1 && calculateTotal() < 40 && (
                            <button className="add-btn-v2" onClick={handleAddRow} title="Add Row">
                              <Plus size={16} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );})}
            </tbody>
          </table>
          
          <div className="table-footer-banner">
            <span>Total: {calculateTotal().toFixed(1)} hrs</span>
          </div>
        </div>

        {!isReadonly && (
          <>
            {(error || success || (status === 'Denied' && rejectionReason)) && (
              <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {status === 'Denied' && rejectionReason && (
                  <div className="error-banner animate-in">
                    <AlertCircle size={20} />
                    <span><strong>Rejected content:</strong> {rejectionReason}</span>
                  </div>
                )}
                {error && (
                  <div className="error-banner animate-in">
                    <AlertCircle size={20} />
                    <span>{error}</span>
                  </div>
                )}
                {success && (
                  <div className="success-banner animate-in">
                    <CheckCircle2 size={20} />
                    <span>{success}</span>
                  </div>
                )}
              </div>
            )}
            
            <div className="footer-actions">
              <button className="btn-premium btn-secondary-outline" onClick={() => handleSave(false)} disabled={loading}>
                <Save size={18} /> Save as Draft
              </button>
              <button 
                className={`btn-premium btn-primary-filled ${calculateTotal() === 40 ? 'highlight' : ''}`}
                onClick={handleSubmitClick} 
                disabled={loading}
              >
                <Send size={18} /> Submit for Review
              </button>
            </div>
          </>
        )}
      </div>
      
      {showSubmitModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-in">
            <div className="modal-icon-box">
              <Send size={24} />
            </div>
            <div className="modal-header">
              <h3>Submit Timesheet?</h3>
            </div>
            <div className="modal-body">
              <p>You are about to submit your timesheet for the week of {selectedWeek}.</p>
              
              <div className="warning-box">
                <AlertCircle className="warning-icon" size={16} />
                <p>Once submitted, all entries for this week will be locked and you won't be able to edit them.</p>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowSubmitModal(false)}>
                Cancel
              </button>
              <button className="btn-confirm" onClick={handleConfirmSubmit}>
                Confirm Submission
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
