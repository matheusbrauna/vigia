import { describe, expect, it } from 'vitest';
import settingsMalformed from './fixtures/claude/settings-malformed.json';
import settingsMissing from './fixtures/claude/settings-missing.json';
import settingsOff from './fixtures/claude/settings-off.json';
import settingsOn from './fixtures/claude/settings-on.json';
import settingsUnset from './fixtures/claude/settings-unset.json';
import { parseTrainingSettings, resultForHttpStatus } from '../detectors/claude-parse';
import { detectors } from '../detectors';

function leavesAccountFieldsOut(result: unknown) {
  const serialized = JSON.stringify(result);
  expect(serialized).not.toContain('fixture-not-an-email');
  expect(serialized).not.toContain('fixture-notice-timestamp');
}

describe('detectors', () => {
  it('registers Claude with the consumer privacy page', () => {
    expect(detectors.map((detector) => detector.id)).toEqual(['chatgpt', 'claude', 'perplexity']);
    expect(detectors[1]).toMatchObject({
      name: 'Claude',
      settingsUrl: 'https://claude.ai/settings/data-privacy-controls',
      hostPermission: 'https://claude.ai/*',
      version: '0.1.0',
    });
  });
});

describe('parseTrainingSettings', () => {
  it('reads training on and off without copying the rest of the account', () => {
    const on = parseTrainingSettings(settingsOn);
    const off = parseTrainingSettings(settingsOff);

    expect(on).toMatchObject({ status: 'on', confidence: 0.85 });
    expect(off).toMatchObject({ status: 'off', confidence: 0.85 });
    expect(on.raw).toBeUndefined();
    leavesAccountFieldsOut(on);
    leavesAccountFieldsOut(off);
  });

  it('does not guess when the choice is unset, missing, or not a boolean', () => {
    const unset = parseTrainingSettings(settingsUnset);
    const missing = parseTrainingSettings(settingsMissing);
    const malformed = parseTrainingSettings(settingsMalformed);

    expect(unset.status).toBe('unknown');
    expect(missing.status).toBe('unknown');
    expect(malformed.status).toBe('unknown');
    expect(unset.confidence).toBe(0);
    expect(parseTrainingSettings(null).status).toBe('unknown');
    leavesAccountFieldsOut(unset);
    leavesAccountFieldsOut(missing);
    leavesAccountFieldsOut(malformed);
  });
});

describe('resultForHttpStatus', () => {
  it('maps auth failures to not-logged-in and other errors to unknown', () => {
    expect(resultForHttpStatus(401)?.status).toBe('not-logged-in');
    expect(resultForHttpStatus(403)?.status).toBe('not-logged-in');
    expect(resultForHttpStatus(500)?.status).toBe('unknown');
    expect(resultForHttpStatus(200)).toBeNull();
  });
});
