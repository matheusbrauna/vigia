import type { CheckResult } from './types';

/** Bumped when the ChatGPT read path or its interpretation changes. */
export const CHATGPT_DETECTOR_VERSION = '0.2.0';

export const CHATGPT_HOST_PERMISSION = 'https://chatgpt.com/*';

/**
 * Session and settings URLs used by the chatgpt.com web client
 * (build e8b36e7fbafa2a7f323d4c4aaa40517a5d6f3d09, observed 2026-11-19).
 * GET /api/auth/session yields a short-lived accessToken.
 * GET /backend-api/settings/user yields settings.training_allowed.
 * The client treats that boolean as "Improve the model for everyone"
 * (`trainingAllowed: settings.training_allowed === true`).
 * The data-controls document is an empty client shell; the flag is not in the HTML.
 */
export const CHATGPT_SESSION_URL = 'https://chatgpt.com/api/auth/session';
export const CHATGPT_SETTINGS_URL = 'https://chatgpt.com/backend-api/settings/user';

const TRAINING_CONFIDENCE = 0.85;
const SESSION_CONFIDENCE = 0.9;

export type SessionClassification =
  | { kind: 'authenticated'; accessToken: string }
  | { kind: 'not-logged-in' }
  | { kind: 'unknown' };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function unknownResult(message: string): CheckResult {
  return { status: 'unknown', confidence: 0, message };
}

export function notLoggedInResult(message: string): CheckResult {
  return { status: 'not-logged-in', confidence: SESSION_CONFIDENCE, message };
}

/** Maps an HTTP status. `null` means the body still has to be parsed. */
export function resultForHttpStatus(status: number): CheckResult | null {
  if (status === 401 || status === 403) {
    return notLoggedInResult('Entre no ChatGPT neste navegador.');
  }
  if (status < 200 || status >= 300) {
    return unknownResult('O ChatGPT respondeu de um jeito inesperado.');
  }
  return null;
}

/**
 * NextAuth returns `{}` when there is no session. A non-empty accessToken
 * string is the only shape the web client treats as a usable session.
 */
export function classifySession(body: unknown): SessionClassification {
  if (!isRecord(body)) return { kind: 'unknown' };
  if (!('accessToken' in body) || body.accessToken == null || body.accessToken === '') {
    return { kind: 'not-logged-in' };
  }
  if (typeof body.accessToken !== 'string') return { kind: 'unknown' };
  return { kind: 'authenticated', accessToken: body.accessToken };
}

export function sessionToResult(session: Exclude<SessionClassification, { kind: 'authenticated' }>): CheckResult {
  if (session.kind === 'not-logged-in') {
    return notLoggedInResult('Entre no ChatGPT neste navegador.');
  }
  return unknownResult('Não foi possível ler a sessão do ChatGPT.');
}

/**
 * Reads only `settings.training_allowed`. Any other field is ignored.
 * Missing or non-boolean values stay `unknown` so a schema change cannot
 * be reported as training on or off.
 */
export function parseTrainingSettings(body: unknown): CheckResult {
  if (!isRecord(body) || !isRecord(body.settings) || !('training_allowed' in body.settings)) {
    return unknownResult('A resposta do ChatGPT não trouxe o estado do treinamento.');
  }

  const value = body.settings.training_allowed;
  if (value === true) {
    return {
      status: 'on',
      confidence: TRAINING_CONFIDENCE,
      message: 'Melhorar o modelo para todos está ligado.',
    };
  }
  if (value === false) {
    return {
      status: 'off',
      confidence: TRAINING_CONFIDENCE,
      message: 'Melhorar o modelo para todos está desligado.',
    };
  }
  return unknownResult('A resposta do ChatGPT não trouxe o estado do treinamento.');
}
