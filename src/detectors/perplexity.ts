import type { CheckResult, Detector } from './types';
import {
  PERPLEXITY_API_VERSION,
  PERPLEXITY_DETECTOR_VERSION,
  PERPLEXITY_HOST_PERMISSION,
  PERPLEXITY_SESSION_URL,
  PERPLEXITY_SETTINGS_URL,
  classifySession,
  parseTrainingSettings,
  resultForHttpStatus,
  sessionToResult,
  unknownResult,
} from './perplexity-parse';

/**
 * Reads "AI data retention" for the logged-in www.perplexity.ai session.
 *
 * The only network calls are two credentialed reads: GET /api/auth/session,
 * then GET /rest/user/settings. The account id from the session is sent back
 * only as the `x-pplx-account` header on that settings request. It is not
 * stored, logged, returned, or sent to any host other than www.perplexity.ai.
 * The session cookie is not read. The rest of both payloads is discarded
 * after reading `user.id` and `disable_training`. Writes are never sent.
 * Without https://www.perplexity.ai/*, the check returns unknown and does
 * not call Perplexity.
 */
export const perplexityDetector: Detector = {
  id: 'perplexity',
  name: 'Perplexity',
  settingsUrl: 'https://www.perplexity.ai/account/preferences',
  hostPermission: PERPLEXITY_HOST_PERMISSION,
  version: PERPLEXITY_DETECTOR_VERSION,

  async check(): Promise<CheckResult> {
    const granted = await chrome.permissions.contains({ origins: [PERPLEXITY_HOST_PERMISSION] });
    if (!granted) {
      return unknownResult('Permita a leitura de www.perplexity.ai para verificar o treinamento.');
    }

    let accountId: string | undefined;
    try {
      const sessionResponse = await fetch(PERPLEXITY_SESSION_URL, {
        credentials: 'include',
        redirect: 'error',
        headers: clientHeaders(),
      });
      const sessionHttp = resultForHttpStatus(sessionResponse.status);
      if (sessionHttp) return sessionHttp;

      const session = classifySession(await readJson(sessionResponse));
      if (session.kind !== 'authenticated') return sessionToResult(session);
      accountId = session.accountId;

      const settingsResponse = await fetch(PERPLEXITY_SETTINGS_URL, {
        credentials: 'include',
        redirect: 'error',
        headers: clientHeaders(accountId),
      });
      const settingsHttp = resultForHttpStatus(settingsResponse.status);
      if (settingsHttp) return settingsHttp;

      return parseTrainingSettings(await readJson(settingsResponse));
    } catch {
      return unknownResult('Não foi possível consultar o Perplexity.');
    } finally {
      accountId = undefined;
    }
  },
};

function clientHeaders(accountId?: string): HeadersInit {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'x-app-apiclient': 'default',
    'x-app-apiversion': PERPLEXITY_API_VERSION,
  };
  if (accountId) headers['x-pplx-account'] = accountId;
  return headers;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}
