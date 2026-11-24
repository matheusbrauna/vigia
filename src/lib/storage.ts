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
   * Revision 3 adds `perplexity`. A stored list at the current revision is kept as written.
   */
  servicesRevision: number;
}

/** Current default-list revision. See `Preferences.servicesRevision`. */
export const ENABLED_SERVICES_REVISION = 3;

const defaultPrefs: Preferences = {
  desiredStatus: {},
  checkIntervalMinutes: 360,
  enabledServices: ['chatgpt', 'claude', 'perplexity'],
  servicesRevision: ENABLED_SERVICES_REVISION,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Fills missing prefs and adds detectors that joined the default list after
 * the stored revision. A 0.1.0 save of `['chatgpt']` had no `servicesRevision`
 * and was not a choice to leave later detectors out. A list saved at the current
 * revision is kept as written.
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

/**
 * The options page writes an explicit service list at the current revision.
 * Unknown service ids and desired-status values are dropped. Each enabled
 * service gets `off` when it has no stored choice. A choice for a disabled
 * service is kept.
 */
export function prefsFromOptions(
  input: {
    checkIntervalMinutes: number;
    enabledServices: readonly string[];
    desiredStatus: Record<string, unknown>;
  },
  knownServiceIds: readonly string[],
): Preferences {
  const enabledServices = knownServiceIds.filter((id) => input.enabledServices.includes(id));
  const desiredStatus: Preferences['desiredStatus'] = {};

  for (const id of knownServiceIds) {
    const status = input.desiredStatus[id];
    if (status === 'on' || status === 'off') desiredStatus[id] = status;
  }
  for (const id of enabledServices) {
    if (!desiredStatus[id]) desiredStatus[id] = 'off';
  }

  return {
    checkIntervalMinutes: input.checkIntervalMinutes,
    enabledServices,
    desiredStatus,
    servicesRevision: ENABLED_SERVICES_REVISION,
  };
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
