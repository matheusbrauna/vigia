import type { Status } from '../detectors/types';

export const CHECK_ALARM_NAME = 'vigia-check';
export const MIN_CHECK_INTERVAL_MINUTES = 30;
export const DEFAULT_CHECK_INTERVAL_MINUTES = 360;
export const MAX_STORED_LOGS = 500;

export function normalizeCheckInterval(minutes: number): number {
  if (!Number.isFinite(minutes)) return DEFAULT_CHECK_INTERVAL_MINUTES;
  return Math.max(MIN_CHECK_INTERVAL_MINUTES, Math.round(minutes));
}

/**
 * A check only counts as a change when the detector reached a conclusive
 * status that is different from the one the user asked to keep.
 */
export function didStatusChange(status: Status, desired: 'off' | 'on'): boolean {
  if (status === 'unknown' || status === 'not-logged-in') return false;
  return status !== desired;
}

export function trimLogs<T>(logs: T[], limit = MAX_STORED_LOGS): T[] {
  if (limit <= 0) return [];
  return logs.slice(0, limit);
}
