import { describe, it, expect } from 'vitest';
import { 
  parsePeriodDate, 
  formatDateISO, 
  getWorkingDays 
} from './dateUtils';

describe('dateUtils', () => {
  it('should parse period date string correctly', () => {
    const dateStr = "26 Jan 2026";
    const date = parsePeriodDate(dateStr);
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(0);
    expect(date.getDate()).toBe(26);
  });

  it('should format date to ISO string correctly (timezone safe)', () => {
    const date = new Date(2026, 0, 26, 23, 59, 0); // Near midnight
    expect(formatDateISO(date)).toBe("2026-01-26");
  });

  it('should generate 5 working days for a week with correct formatting', () => {
    const weekStart = new Date(2026, 0, 25); // Sunday, 25 Jan 2026
    const days = getWorkingDays(weekStart);
    expect(days).toHaveLength(5);
    // Note: en-GB toLocaleDateString usually gives "Monday 26 Jan" or similar without comma
    expect(days[0]).toMatch(/Monday\s+26\s+Jan/); 
    expect(days[4]).toMatch(/Friday\s+30\s+Jan/);
  });
});
