interface FormatRelativeTimeOptions {
  isoTimestamp: string;
  /** Injectable for deterministic tests; defaults to now. */
  now?: Date;
}

const MINUTE_IN_SECONDS = 60;
const HOUR_IN_SECONDS = 60 * MINUTE_IN_SECONDS;
const DAY_IN_SECONDS = 24 * HOUR_IN_SECONDS;
const WEEK_IN_SECONDS = 7 * DAY_IN_SECONDS;

/**
 * Formats an ISO timestamp as a compact relative string like "3h ago" or
 * "2d ago". Falls back to a short date for anything older than a week.
 */
export function formatRelativeTime({ isoTimestamp, now = new Date() }: FormatRelativeTimeOptions): string {
  const published = new Date(isoTimestamp);
  if (Number.isNaN(published.getTime())) {
    return '';
  }

  const elapsedSeconds = Math.max(0, Math.floor((now.getTime() - published.getTime()) / 1000));

  if (elapsedSeconds < MINUTE_IN_SECONDS) {
    return 'just now';
  }
  if (elapsedSeconds < HOUR_IN_SECONDS) {
    return `${Math.floor(elapsedSeconds / MINUTE_IN_SECONDS)}m ago`;
  }
  if (elapsedSeconds < DAY_IN_SECONDS) {
    return `${Math.floor(elapsedSeconds / HOUR_IN_SECONDS)}h ago`;
  }
  if (elapsedSeconds < WEEK_IN_SECONDS) {
    return `${Math.floor(elapsedSeconds / DAY_IN_SECONDS)}d ago`;
  }

  return published.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
