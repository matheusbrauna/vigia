import type { LogEntry } from '../detectors/types';
import { trimLogs } from './checks';

export const LOGS_KEY = 'vigia_logs';
export const PREFS_KEY = 'vigia_prefs';

export interface Preferences {
  desiredStatus: Record<string, 'off' | 'on'>;
  checkIntervalMinutes: number;
  enabledServices: string[];
}

const defaultPrefs: Preferences = {
  desiredStatus: {},
  checkIntervalMinutes: 360,
  enabledServices: ['chatgpt'],
};

export async function getLogs(): Promise<LogEntry[]> {
  const result = await chrome.storage.local.get(LOGS_KEY);
  const stored = result[LOGS_KEY];
  return Array.isArray(stored) ? (stored as LogEntry[]) : [];
}

export async function addLog(entry: Omit<LogEntry, 'timestamp'>): Promise<void> {
  const logs = await getLogs();
  const newEntry: LogEntry = {
    ...entry,
    timestamp: Date.now(),
  };
  logs.unshift(newEntry);
  await chrome.storage.local.set({ [LOGS_KEY]: trimLogs(logs) });
}

export async function getPrefs(): Promise<Preferences> {
  const result = await chrome.storage.local.get(PREFS_KEY);
  const stored = result[PREFS_KEY];
  if (!stored || typeof stored !== 'object') return { ...defaultPrefs };
  return { ...defaultPrefs, ...(stored as Partial<Preferences>) };
}

export async function savePrefs(prefs: Partial<Preferences>): Promise<void> {
  const current = await getPrefs();
  await chrome.storage.local.set({ [PREFS_KEY]: { ...current, ...prefs } });
}
