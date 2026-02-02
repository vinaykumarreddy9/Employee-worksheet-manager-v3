import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/apiService';
import './Dashboard.css';
import { Plus, Save, Send, AlertCircle, CheckCircle2 } from 'lucide-react';
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
  const [rowErrors, setRowErrors] = useState({});

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
    } catch {
      setError('Failed to fetch timesheet data.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRow = () => {
    const lastEntry = entries[entries.length - 1];
    if (!lastEntry.task_description) {
      setRowErrors({ [entries.length - 1]: 'Enter description before adding a new row.' });
      return;
    }
    
    const startDateStr = selectedWeek.split(' - ')[0];
    const workingDays = getWorkingDays(parsePeriodDate(startDateStr));
    const lastDateIdx = workingDays.indexOf(lastEntry.displayDate);
    const nextDate = workingDays[Math.min(lastDateIdx + 1, 4)];

    // Calculate actual date for next row
    const startDate = parsePeriodDate(startDateStr);
    const dayOffset = workingDays.indexOf(nextDate) + 1;
    const actualDate = new Date(startDate);
    actualDate.setDate(startDate.getDate() + dayOffset);

    setEntries([...entries, {
      date: formatDateISO(actualDate),
      displayDate: nextDate,
      hours: 8.0,
      task_description: '',
      work_type: 'Billable'
    }]);
    setRowErrors({});
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
  };

  const calculateTotal = () => {
    return entries.reduce((sum, entry) => sum + parseFloat(entry.hours || 0), 0);
  };

  const handleSave = async (isSubmit = false) => {
    setLoading(true);
    setError('');
    
    // 1. Validate mandatory fields
    for (let i = 0; i < entries.length; i++) {
        if (!entries[i].task_description.trim()) {
            setRowErrors({ [i]: 'Description is required' });
            setError(`Row ${i+1} is missing a description.`);
            setLoading(false);
            return;
        }
    }

    // 2. Validate Daily Totals
    const dailyTotals = {};
    for (const entry of entries) {
        dailyTotals[entry.date] = (dailyTotals[entry.date] || 0) + parseFloat(entry.hours);
        if (dailyTotals[entry.date] > 8) {
            setError(`Total hours for ${entry.displayDate} cannot exceed 8 hours (Current: ${dailyTotals[entry.date]}h)`);
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
        alert('🚀 Timesheet submitted to admin for review!');
      } else {
        alert('✅ Saved successfully as draft.');
      }
      fetchTimesheet();
    } catch (err) {
      setError(err.message || 'Failed to communicate with server.');
    } finally {
      setLoading(false);
    }
  };

  const isReadonly = status === 'Submitted' || status === 'Approved';

  return (
    <div className="dashboard animate-in">
      <div className="dashboard-header">
        <h2>Employee Dashboard</h2>
        <div className="week-selector">
          <label>Select Period</label>
          <select value={selectedWeek} onChange={(e) => setSelectedWeek(e.target.value)} disabled={loading}>
            {weeks.map(w => <option key={w} value={w}>{w}</option>)}
          </select>
        </div>
      </div>


      {isReadonly && (
        <div className="info-banner">
          <CheckCircle2 size={18} />
          <span>📅 This timesheet is currently <strong>{status}</strong> and is in read-only mode.</span>
        </div>
      )}

      {status === 'Denied' && (
        <div className="error-banner">
          <AlertCircle size={18} />
          <span>❌ <strong>This timesheet was Rejected.</strong> Reason: {rejectionReason || 'No reason provided'}. You can now edit and resubmit.</span>
        </div>
      )}

      <div className="timesheet-container card">
        <div className="timesheet-grid-header">
          <div className="grid-col date">DATE</div>
          <div className="grid-col hours">HOURS</div>
          <div className="grid-col desc">PROJECT DESCRIPTION</div>
          <div className="grid-col type">WORK TYPE</div>
          <div className="grid-col action">ACTION</div>
        </div>

        <div className="timesheet-rows">
          {entries.map((entry, index) => (
            <div key={index} className="timesheet-row">
              <div className="grid-col date">
                <select 
                  value={entry.displayDate} 
                  onChange={(e) => handleEntryChange(index, 'displayDate', e.target.value)}
                  disabled={isReadonly}
                >
                  {getWorkingDays(parsePeriodDate(selectedWeek.split(' - ')[0])).map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div className="grid-col hours">
                <input 
                  type="number" 
                  step="0.5" 
                  min="0" 
                  max="8" 
                  value={entry.hours}
                  onChange={(e) => handleEntryChange(index, 'hours', e.target.value)}
                  disabled={isReadonly || entry.work_type === 'Holiday'}
                />
              </div>
              <div className="grid-col desc">
                <input 
                  placeholder="Describe task..." 
                  value={entry.task_description}
                  onChange={(e) => handleEntryChange(index, 'task_description', e.target.value)}
                  disabled={isReadonly}
                />
                {rowErrors[index] && <span className="row-error">{rowErrors[index]}</span>}
              </div>
              <div className="grid-col type">
                <select 
                  value={entry.work_type}
                  onChange={(e) => handleEntryChange(index, 'work_type', e.target.value)}
                  disabled={isReadonly}
                >
                  <option value="Billable">Billable</option>
                  <option value="Holiday">Holiday</option>
                </select>
              </div>
              <div className="grid-col action">
                {isReadonly ? '🔒' : (
                  index === entries.length - 1 && calculateTotal() < 40 && (
                    <button className="add-btn" onClick={handleAddRow}>
                      <Plus size={16} /> Add
                    </button>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {calculateTotal() >= 40 && (
        <div className="milestone-banner">
          🎉 Weekly Milestone Reached: All 40 hours for this week have been successfully documented.
        </div>
      )}

      {error && <div className="error-message">{error}</div>}

      {!isReadonly && (
        <div className="dashboard-footer">
          <button className="secondary-btn" onClick={() => handleSave(false)} disabled={loading}>
            <Save size={18} /> Save
          </button>
          <button 
            className={`primary-btn ${calculateTotal() === 40 ? 'highlight' : ''}`}
            onClick={() => handleSave(true)} 
            disabled={loading}
          >
            <Send size={18} /> {status === 'Pending' ? 'Finalize & Submit' : 'Submit'}
          </button>
        </div>
      )}
    </div>
  );
};
