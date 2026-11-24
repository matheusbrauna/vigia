import { describe, expect, it } from 'vitest';
import { didStatusChange, normalizeCheckInterval, trimLogs } from '../lib/checks';
import { normalizePrefs, prefsFromOptions } from '../lib/storage';

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

  it('adds detectors that joined the default list and then keeps an explicit list', () => {
    expect(normalizePrefs(undefined).enabledServices).toEqual(['chatgpt', 'claude', 'perplexity']);

    const fromV1 = normalizePrefs({
      checkIntervalMinutes: 120,
      enabledServices: ['chatgpt'],
      desiredStatus: { chatgpt: 'on' },
    });
    expect(fromV1.enabledServices).toEqual(['chatgpt', 'claude', 'perplexity']);
    expect(fromV1.servicesRevision).toBe(3);
    expect(fromV1.checkIntervalMinutes).toBe(120);
    expect(fromV1.desiredStatus).toEqual({ chatgpt: 'on' });

    expect(
      normalizePrefs({ enabledServices: ['chatgpt', 'claude'], servicesRevision: 2 }).enabledServices,
    ).toEqual(['chatgpt', 'claude', 'perplexity']);

    expect(
      normalizePrefs({ enabledServices: ['chatgpt'], servicesRevision: 3 }).enabledServices,
    ).toEqual(['chatgpt']);
  });

  it('writes an explicit service list and drops unknown ids', () => {
    const known = ['chatgpt', 'claude', 'perplexity'];
    expect(
      prefsFromOptions(
        {
          checkIntervalMinutes: 120,
          enabledServices: ['claude', 'chatgpt', 'grok'],
          desiredStatus: { chatgpt: 'on', claude: 'off', grok: 'on' },
        },
        known,
      ),
    ).toEqual({
      checkIntervalMinutes: 120,
      enabledServices: ['chatgpt', 'claude'],
      desiredStatus: { chatgpt: 'on', claude: 'off' },
      servicesRevision: 3,
    });
  });

  it('defaults an enabled service to off and keeps a disabled choice', () => {
    expect(
      prefsFromOptions(
        {
          checkIntervalMinutes: 360,
          enabledServices: ['chatgpt'],
          desiredStatus: { chatgpt: 'maybe', claude: 'on' },
        },
        ['chatgpt', 'claude'],
      ),
    ).toMatchObject({
      enabledServices: ['chatgpt'],
      desiredStatus: { chatgpt: 'off', claude: 'on' },
      servicesRevision: 3,
    });
  });

  it('reads the check interval from prefs and clamps it', () => {
    expect(normalizeCheckInterval(360)).toBe(360);
    expect(normalizeCheckInterval(15)).toBe(30);
    expect(normalizeCheckInterval(Number.NaN)).toBe(360);
  });
});
