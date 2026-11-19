import { describe, expect, it } from 'vitest';
import sessionAuthenticated from './fixtures/chatgpt/session-authenticated.json';
import sessionLoggedOut from './fixtures/chatgpt/session-logged-out.json';
import sessionMalformed from './fixtures/chatgpt/session-malformed.json';
import settingsMalformed from './fixtures/chatgpt/settings-malformed.json';
import settingsMissing from './fixtures/chatgpt/settings-missing.json';
import settingsOff from './fixtures/chatgpt/settings-off.json';
import settingsOn from './fixtures/chatgpt/settings-on.json';
import {
  classifySession,
  parseTrainingSettings,
  resultForHttpStatus,
} from '../detectors/chatgpt-parse';

describe('parseTrainingSettings', () => {
  it('reads training on and off without copying the rest of the payload', () => {
    const on = parseTrainingSettings(settingsOn);
    const off = parseTrainingSettings(settingsOff);

    expect(on).toMatchObject({ status: 'on', confidence: 0.85 });
    expect(off).toMatchObject({ status: 'off', confidence: 0.85 });
    expect(on.raw).toBeUndefined();
    expect(JSON.stringify(on)).not.toContain('sunshine');
    expect(JSON.stringify(off)).not.toContain('sunshine');
  });

  it('does not guess when the field is missing or not a boolean', () => {
    expect(parseTrainingSettings(settingsMissing).status).toBe('unknown');
    const malformed = parseTrainingSettings(settingsMalformed);
    expect(malformed.status).toBe('unknown');
    expect(malformed.confidence).toBe(0);
    expect(JSON.stringify(malformed)).not.toContain('fixture-not-a-token');
  });
});

describe('classifySession', () => {
  it('treats an empty session as logged out and keeps a fixture token out of the status', () => {
    expect(classifySession(sessionLoggedOut)).toEqual({ kind: 'not-logged-in' });

    const session = classifySession(sessionAuthenticated);
    expect(session.kind).toBe('authenticated');
    if (session.kind !== 'authenticated') return;
    expect(session.accessToken).toBe('fixture-access-token');
  });

  it('treats a non-string token as malformed', () => {
    expect(classifySession(sessionMalformed)).toEqual({ kind: 'unknown' });
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
