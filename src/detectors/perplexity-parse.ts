import type { CheckResult } from './types';

/** Bumped when the Perplexity read path or its interpretation changes. */
export const PERPLEXITY_DETECTOR_VERSION = '0.1.0';

export const PERPLEXITY_HOST_PERMISSION = 'https://www.perplexity.ai/*';

/**
 * Client API version observed on www.perplexity.ai (2026-11-24).
 * The web client sends it as `x-app-apiversion` and as `version` on both reads.
 */
export const PERPLEXITY_API_VERSION = '2.18';

/**
 * Session and settings URLs used by the signed-in www.perplexity.ai web client.
 * GET /api/auth/session yields `{ user: { id } }` for the active account.
 * An empty body is the logged-out NextAuth session.
 * GET /rest/user/settings yields `disable_training` at the top level.
 * `skip_connector_picker_credentials` keeps connector secrets out of that body.
 *
 * `disable_training` is the inverse of the Preferences toggle "AI data retention"
 * (Perplexity Help Center, 2026-11-20). `false` means the toggle is on and new
 * data may be used to train models. `true` means the user opted out.
 * A signed-out GET of the settings URL still returns `disable_training: false`,
 * so that field is only read after a session user id is present.
 * The account id is sent back only as `x-pplx-account` on the settings read.
 * Without that header the settings URL can answer with the guest payload.
 * This detector never writes.
 */
export const PERPLEXITY_SESSION_URL =
  `https://www.perplexity.ai/api/auth/session?version=${PERPLEXITY_API_VERSION}&source=default`;
export const PERPLEXITY_SETTINGS_URL =
  `https://www.perplexity.ai/rest/user/settings?skip_connector_picker_credentials=true&version=${PERPLEXITY_API_VERSION}&source=default`;

const TRAINING_CONFIDENCE = 0.85;
const SESSION_CONFIDENCE = 0.9;

/** Header-safe account id. Rejects whitespace so the value cannot break the request. */
const ACCOUNT_ID = /^[A-Za-z0-9_-]{1,128}$/;

export type SessionClassification =
  | { kind: 'authenticated'; accountId: string }
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
    return notLoggedInResult('Entre no Perplexity neste navegador.');
  }
  if (status < 200 || status >= 300) {
    return unknownResult('O Perplexity respondeu de um jeito inesperado.');
  }
  return null;
}

/**
 * A non-empty `user.id` string is the only shape treated as a usable session.
 * The id is the active account. Email and every other session field are ignored.
 */
export function classifySession(body: unknown): SessionClassification {
  if (!isRecord(body)) return { kind: 'unknown' };
  if (!('user' in body) || body.user == null) return { kind: 'not-logged-in' };
  if (!isRecord(body.user) || typeof body.user.id !== 'string' || !ACCOUNT_ID.test(body.user.id)) {
    return { kind: 'unknown' };
  }
  return { kind: 'authenticated', accountId: body.user.id };
}

export function sessionToResult(session: Exclude<SessionClassification, { kind: 'authenticated' }>): CheckResult {
  if (session.kind === 'not-logged-in') {
    return notLoggedInResult('Entre no Perplexity neste navegador.');
  }
  return unknownResult('Não foi possível ler a sessão do Perplexity.');
}

/**
 * Reads only `disable_training`. Any other field is ignored.
 * `false` is training on. `true` is training off. Missing or non-boolean
 * values stay `unknown` so a schema change cannot be reported as either.
 */
export function parseTrainingSettings(body: unknown): CheckResult {
  if (!isRecord(body) || !('disable_training' in body)) {
    return unknownResult('A resposta do Perplexity não trouxe o estado do treinamento.');
  }

  const value = body.disable_training;
  if (value === false) {
    return {
      status: 'on',
      confidence: TRAINING_CONFIDENCE,
      message: 'A retenção de dados de IA está ligada.',
    };
  }
  if (value === true) {
    return {
      status: 'off',
      confidence: TRAINING_CONFIDENCE,
      message: 'A retenção de dados de IA está desligada.',
    };
  }
  return unknownResult('A resposta do Perplexity não trouxe o estado do treinamento.');
}
