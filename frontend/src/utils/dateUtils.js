/**
 * Centralized Date Utilities for Timesheet Application
 * Handles ISO conversion, formatting, and period selection logic.
 */

export const formatDateISO = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const parseDateISO = (dateStr) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

// Formats for display: "Monday, 26 Jan"
export const formatDisplayDate = (date) => {
  // Use en-GB for "DD MMM" order
  return date.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'short' });
};

// Parses "26 Jan 2026"
export const parsePeriodDate = (dateStr) => {
  const parts = dateStr.split(' ');
  const months = { 'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5, 'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11 };
  if (parts.length < 3) return new Date();
  // parts[0] is DD, parts[1] is MMM, parts[2] is YYYY
  return new Date(parseInt(parts[2]), months[parts[1]], parseInt(parts[0]));
};

export const getWorkingDays = (weekStartDate) => {
  const days = [];
  for (let i = 1; i <= 5; i++) {
    const d = new Date(weekStartDate);
    d.setHours(0,0,0,0);
    d.setDate(weekStartDate.getDate() + i);
    days.push(formatDisplayDate(d));
  }
  return days;
};

export const getPastWeeks = () => {
  const today = new Date();
  const daysSinceSunday = today.getDay();
  const currentSunday = new Date(today);
  currentSunday.setDate(today.getDate() - daysSinceSunday);
  currentSunday.setHours(0, 0, 0, 0);

  const result = [];
  for (let i = 1; i <= 4; i++) {
    const start = new Date(currentSunday);
    start.setDate(currentSunday.getDate() - (i * 7));
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    
    const format = (d) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    result.push(`${format(start)} - ${format(end)}`);
  }
  return result;
};
