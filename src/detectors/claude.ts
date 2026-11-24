import type { CheckResult, Detector } from './types';
import {
  CLAUDE_ACCOUNT_URL,
  CLAUDE_DETECTOR_VERSION,
  CLAUDE_HOST_PERMISSION,
  parseTrainingSettings,
  resultForHttpStatus,
  unknownResult,
} from './claude-parse';

/**
 * Reads "Help Improve our AI models" for the logged-in claude.ai session.
 *
 * The only network call is GET https://claude.ai/api/account with the
 * browser cookies. The session cookie is not read, stored, or logged.
 * The rest of the account payload is discarded after reading
 * settings.grove_enabled. Writes (PATCH /api/oauth/account/settings)
 * are never sent. Without https://claude.ai/*, the check returns
 * unknown and does not call Claude.
 */
export const claudeDetector: Detector = {
  id: 'claude',
  name: 'Claude',
  settingsUrl: 'https://claude.ai/settings/data-privacy-controls',
  hostPermission: CLAUDE_HOST_PERMISSION,
  version: CLAUDE_DETECTOR_VERSION,

  async check(): Promise<CheckResult> {
    const granted = await chrome.permissions.contains({ origins: [CLAUDE_HOST_PERMISSION] });
    if (!granted) {
      return unknownResult('Permita a leitura de claude.ai para verificar o treinamento.');
    }

    try {
      const response = await fetch(CLAUDE_ACCOUNT_URL, {
        credentials: 'include',
        redirect: 'error',
        headers: { Accept: 'application/json' },
      });
      const http = resultForHttpStatus(response.status);
      if (http) return http;

      return parseTrainingSettings(await readJson(response));
    } catch {
      return unknownResult('Não foi possível consultar o Claude.');
    }
  },
};

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}
