export type Status = 'on' | 'off' | 'unknown' | 'not-logged-in';

export interface CheckResult {
  status: Status;
  confidence: number; // 0-1
  message?: string;
  raw?: unknown;
}

export interface Detector {
  id: string;
  name: string;
  settingsUrl: string;
  hostPermission: string;
  version: string;
  check(): Promise<CheckResult>;
}

export interface LogEntry {
  service: string;
  status: Status;
  timestamp: number;
  changed: boolean;
  detectorVersion: string;
}
