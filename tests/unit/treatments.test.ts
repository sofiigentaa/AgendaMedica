import { describe, it, expect } from 'vitest';
import {
  TREATMENTS,
  getTreatmentById,
  calculateEndTime,
  calculateDurationMinutes,
  formatCurrency,
} from '../../src/data/treatments';

describe('getTreatmentById', () => {
  it('returns the matching treatment', () => {
    const t = getTreatmentById('laser');
    expect(t.name).toBe('Láser');
    expect(t.durationMinutes).toBe(30);
  });

  it('falls back to "Consulta Médica" for an unknown id', () => {
    const t = getTreatmentById('does-not-exist');
    expect(t.id).toBe('consulta');
  });

  it('every treatment has a positive duration and non-negative fee', () => {
    TREATMENTS.forEach((t) => {
      expect(t.durationMinutes).toBeGreaterThan(0);
      expect(t.defaultFee).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('calculateEndTime', () => {
  it('adds duration within the same hour', () => {
    expect(calculateEndTime('14:30', 30)).toBe('15:00');
  });

  it('rolls over to the next hour', () => {
    expect(calculateEndTime('14:45', 30)).toBe('15:15');
  });

  it('rolls over past midnight', () => {
    expect(calculateEndTime('23:45', 30)).toBe('00:15');
  });

  it('returns the input unchanged when start time is invalid', () => {
    expect(calculateEndTime('', 30)).toBe('');
    expect(calculateEndTime('not-a-time', 30)).toBe('not-a-time');
  });
});

describe('calculateDurationMinutes', () => {
  it('computes the difference between two times', () => {
    expect(calculateDurationMinutes('14:30', '15:00')).toBe(30);
    expect(calculateDurationMinutes('14:30', '16:15')).toBe(105);
  });

  it('returns 0 when end is not after start', () => {
    expect(calculateDurationMinutes('15:00', '15:00')).toBe(0);
    expect(calculateDurationMinutes('15:00', '14:30')).toBe(0);
  });

  it('returns 0 for malformed input', () => {
    expect(calculateDurationMinutes('', '15:00')).toBe(0);
    expect(calculateDurationMinutes('14:30', '')).toBe(0);
  });
});

describe('formatCurrency', () => {
  it('formats a number as ARS currency without decimals', () => {
    const formatted = formatCurrency(32000);
    expect(formatted).toContain('32.000');
    expect(formatted).toContain('$');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toContain('0');
  });
});
