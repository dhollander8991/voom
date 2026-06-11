import { describe, expect, it } from 'vitest';
import { formatRelativeTime } from './relativeTime';

const NOW = new Date('2026-06-11T12:00:00Z');

describe('formatRelativeTime', () => {
  it('returns "just now" for sub-minute differences', () => {
    expect(formatRelativeTime({ isoTimestamp: '2026-06-11T11:59:30Z', now: NOW })).toBe('just now');
  });

  it('formats minutes', () => {
    expect(formatRelativeTime({ isoTimestamp: '2026-06-11T11:45:00Z', now: NOW })).toBe('15m ago');
  });

  it('formats hours', () => {
    expect(formatRelativeTime({ isoTimestamp: '2026-06-11T09:00:00Z', now: NOW })).toBe('3h ago');
  });

  it('formats days', () => {
    expect(formatRelativeTime({ isoTimestamp: '2026-06-09T12:00:00Z', now: NOW })).toBe('2d ago');
  });

  it('falls back to a date for anything older than a week', () => {
    const result = formatRelativeTime({ isoTimestamp: '2026-01-01T12:00:00Z', now: NOW });
    expect(result).not.toMatch(/ago/);
    expect(result).toMatch(/2026/);
  });

  it('returns an empty string for an invalid timestamp', () => {
    expect(formatRelativeTime({ isoTimestamp: 'not-a-date', now: NOW })).toBe('');
  });
});
