import type { LogEntry } from '../detectors/types';
import { trimLogs } from './checks';

export const LOGS_KEY = 'vigia_logs';
export const PREFS_KEY = 'vigia_prefs';

export interface Preferences {
  desiredStatus: Record<string, 'off' | 'on'>;
  checkIntervalMinutes: number;
  enabledServices: string[];
  /**
   * Bumped when a detector joins the default enabled list.
   * Revision 1 is the 0.1.0 default (`chatgpt` only). Revision 2 adds `claude`.
   * A stored list at the current revision is kept as written.
   */
  servicesRevision: number;
}

/** Current default-list revision. See `Preferences.servicesRevision`. */
export const ENABLED_SERVICES_REVISION = 2;

const defaultPrefs: Preferences = {
  desiredStatus: {},
  checkIntervalMinutes: 360,
  enabledServices: ['chatgpt', 'claude'],
  servicesRevision: ENABLED_SERVICES_REVISION,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Fills missing prefs and adds detectors that joined the default list after
 * the stored revision. The options page still cannot edit this list, so a
 * 0.1.0 save of `['chatgpt']` was not a choice to leave Claude out.
 */
export function normalizePrefs(stored: unknown): Preferences {
  const base: Preferences = {
    ...defaultPrefs,
    desiredStatus: {},
    enabledServices: [...defaultPrefs.enabledServices],
  };
  if (!isRecord(stored)) return base;

  const partial = stored as Partial<Preferences>;
  const enabledServices = Array.isArray(partial.enabledServices)
    ? partial.enabledServices.filter((id): id is string => typeof id === 'string')
    : base.enabledServices;
  const prefs: Preferences = {
    ...base,
    ...partial,
    desiredStatus: {
      ...base.desiredStatus,
      ...(isRecord(partial.desiredStatus)
        ? (partial.desiredStatus as Preferences['desiredStatus'])
        : {}),
    },
    enabledServices: [...enabledServices],
    servicesRevision:
      typeof partial.servicesRevision === 'number' ? partial.servicesRevision : 1,
  };

  if (prefs.servicesRevision < ENABLED_SERVICES_REVISION) {
    for (const id of defaultPrefs.enabledServices) {
      if (!prefs.enabledServices.includes(id)) prefs.enabledServices.push(id);
    }
    prefs.servicesRevision = ENABLED_SERVICES_REVISION;
  }

  return prefs;
}

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
  return normalizePrefs(result[PREFS_KEY]);
}

export async function savePrefs(prefs: Partial<Preferences>): Promise<void> {
  const current = await getPrefs();
  await chrome.storage.local.set({ [PREFS_KEY]: { ...current, ...prefs } });
}
