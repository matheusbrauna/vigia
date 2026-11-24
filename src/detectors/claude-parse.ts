import type { CheckResult } from './types';

/** Bumped when the Claude read path or its interpretation changes. */
export const CLAUDE_DETECTOR_VERSION = '0.1.0';

export const CLAUDE_HOST_PERMISSION = 'https://claude.ai/*';

/**
 * Account URL used by the signed-in claude.ai web session.
 * GET /api/account (credentials: "include") returns the account object.
 * settings.grove_enabled is the consumer "Help Improve our AI models" choice:
 * the same field Claude Code reads from GET /api/oauth/account/settings.
 * true allows chats and coding sessions to be used to improve Claude,
 * false does not, and null means no choice is stored.
 * The privacy page is https://claude.ai/settings/data-privacy-controls
 * (Anthropic Privacy Center, 2026-08-03). This detector never writes.
 */
export const CLAUDE_ACCOUNT_URL = 'https://claude.ai/api/account';

const TRAINING_CONFIDENCE = 0.85;
const SESSION_CONFIDENCE = 0.9;

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
    return notLoggedInResult('Entre no Claude neste navegador.');
  }
  if (status < 200 || status >= 300) {
    return unknownResult('O Claude respondeu de um jeito inesperado.');
  }
  return null;
}

/**
 * Reads only `settings.grove_enabled`. Any other field is ignored.
 * `null` means the account has no stored choice. Missing or non-boolean
 * values stay `unknown`, including Team, Enterprise, and API accounts,
 * whose training controls are not this field.
 */
export function parseTrainingSettings(body: unknown): CheckResult {
  if (!isRecord(body) || !isRecord(body.settings) || !('grove_enabled' in body.settings)) {
    return unknownResult('A resposta do Claude não trouxe o estado do treinamento.');
  }

  const value = body.settings.grove_enabled;
  if (value === true) {
    return {
      status: 'on',
      confidence: TRAINING_CONFIDENCE,
      message: 'Ajudar a melhorar os modelos de IA está ligado.',
    };
  }
  if (value === false) {
    return {
      status: 'off',
      confidence: TRAINING_CONFIDENCE,
      message: 'Ajudar a melhorar os modelos de IA está desligado.',
    };
  }
  if (value === null) {
    return unknownResult('O Claude ainda não registrou a escolha de treinamento.');
  }
  return unknownResult('A resposta do Claude não trouxe o estado do treinamento.');
}
