import { describe, expect, it } from 'vitest';
import sessionAuthenticated from './fixtures/perplexity/session-authenticated.json';
import sessionLoggedOut from './fixtures/perplexity/session-logged-out.json';
import sessionMalformed from './fixtures/perplexity/session-malformed.json';
import sessionNullUser from './fixtures/perplexity/session-null-user.json';
import settingsMalformed from './fixtures/perplexity/settings-malformed.json';
import settingsMissing from './fixtures/perplexity/settings-missing.json';
import settingsOff from './fixtures/perplexity/settings-off.json';
import settingsOn from './fixtures/perplexity/settings-on.json';
import {
  classifySession,
  parseTrainingSettings,
  resultForHttpStatus,
  sessionToResult,
} from '../detectors/perplexity-parse';
import { detectors } from '../detectors';

function leavesSettingsFieldsOut(result: unknown) {
  const serialized = JSON.stringify(result);
  expect(serialized).not.toContain('fixture-not-a-model');
  expect(serialized).not.toContain('fixture-not-a-secret');
}

describe('detectors', () => {
  it('registers Perplexity with the preferences page', () => {
    expect(detectors.map((detector) => detector.id)).toEqual(['chatgpt', 'claude', 'perplexity']);
    expect(detectors[2]).toMatchObject({
      name: 'Perplexity',
      settingsUrl: 'https://www.perplexity.ai/account/preferences',
      hostPermission: 'https://www.perplexity.ai/*',
      version: '0.1.0',
    });
  });
});

describe('parseTrainingSettings', () => {
  it('treats disable_training false as on and true as off', () => {
    const on = parseTrainingSettings(settingsOn);
    const off = parseTrainingSettings(settingsOff);

    expect(on).toMatchObject({ status: 'on', confidence: 0.85 });
    expect(off).toMatchObject({ status: 'off', confidence: 0.85 });
    expect(on.raw).toBeUndefined();
    leavesSettingsFieldsOut(on);
    leavesSettingsFieldsOut(off);
  });

  it('does not guess when the field is missing or not a boolean', () => {
    const missing = parseTrainingSettings(settingsMissing);
    const malformed = parseTrainingSettings(settingsMalformed);

    expect(missing.status).toBe('unknown');
    expect(malformed.status).toBe('unknown');
    expect(malformed.confidence).toBe(0);
    expect(parseTrainingSettings(null).status).toBe('unknown');
    leavesSettingsFieldsOut(missing);
    leavesSettingsFieldsOut(malformed);
  });
});

describe('classifySession', () => {
  it('keeps a fixture account id and drops the rest of the session', () => {
    const session = classifySession(sessionAuthenticated);
    expect(session).toEqual({ kind: 'authenticated', accountId: 'fixture-account-id' });
    expect(JSON.stringify(session)).not.toContain('fixture-not-an-email');
    expect(JSON.stringify(session)).not.toContain('fixture-not-a-name');
  });

  it('treats an empty session and a null user as logged out', () => {
    expect(classifySession(sessionLoggedOut)).toEqual({ kind: 'not-logged-in' });
    expect(classifySession(sessionNullUser)).toEqual({ kind: 'not-logged-in' });
    expect(JSON.stringify(sessionToResult({ kind: 'not-logged-in' }))).not.toContain('fixture-not-an-email');
  });

  it('treats a non-string account id as malformed', () => {
    expect(classifySession(sessionMalformed)).toEqual({ kind: 'unknown' });
    expect(classifySession({ user: { id: 'not an id' } })).toEqual({ kind: 'unknown' });
    expect(classifySession(null)).toEqual({ kind: 'unknown' });
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
