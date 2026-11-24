import { describe, expect, it } from 'vitest';
import { didStatusChange, normalizeCheckInterval, trimLogs } from '../lib/checks';
import { normalizePrefs } from '../lib/storage';

describe('didStatusChange', () => {
  it('flags a conclusive status that differs from the desired one', () => {
    expect(didStatusChange('on', 'off')).toBe(true);
    expect(didStatusChange('off', 'on')).toBe(true);
  });

  it('ignores matches and inconclusive results', () => {
    expect(didStatusChange('off', 'off')).toBe(false);
    expect(didStatusChange('on', 'on')).toBe(false);
    expect(didStatusChange('unknown', 'off')).toBe(false);
    expect(didStatusChange('not-logged-in', 'off')).toBe(false);
  });
});

describe('storage helpers', () => {
  it('keeps the newest logs and drops the rest', () => {
    const logs = Array.from({ length: 503 }, (_, index) => index);
    expect(trimLogs(logs, 500)).toEqual(logs.slice(0, 500));
    expect(trimLogs(logs, 0)).toEqual([]);
  });

  it('adds claude to a 0.1.0 enabled list and then keeps an explicit list', () => {
    expect(normalizePrefs(undefined).enabledServices).toEqual(['chatgpt', 'claude']);

    const migrated = normalizePrefs({
      checkIntervalMinutes: 120,
      enabledServices: ['chatgpt'],
      desiredStatus: { chatgpt: 'on' },
    });
    expect(migrated.enabledServices).toEqual(['chatgpt', 'claude']);
    expect(migrated.servicesRevision).toBe(2);
    expect(migrated.checkIntervalMinutes).toBe(120);
    expect(migrated.desiredStatus).toEqual({ chatgpt: 'on' });

    expect(
      normalizePrefs({ enabledServices: ['chatgpt'], servicesRevision: 2 }).enabledServices,
    ).toEqual(['chatgpt']);
  });

  it('reads the check interval from prefs and clamps it', () => {
    expect(normalizeCheckInterval(360)).toBe(360);
    expect(normalizeCheckInterval(15)).toBe(30);
    expect(normalizeCheckInterval(Number.NaN)).toBe(360);
  });
});
