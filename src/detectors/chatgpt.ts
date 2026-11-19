import type { CheckResult, Detector } from './types';
import {
  CHATGPT_DETECTOR_VERSION,
  CHATGPT_HOST_PERMISSION,
  CHATGPT_SESSION_URL,
  CHATGPT_SETTINGS_URL,
  classifySession,
  parseTrainingSettings,
  resultForHttpStatus,
  sessionToResult,
  unknownResult,
} from './chatgpt-parse';

/**
 * Reads "Improve the model for everyone" for the logged-in chatgpt.com session.
 *
 * Mechanism (chatgpt.com client build e8b36e7fbafa2a7f323d4c4aaa40517a5d6f3d09,
 * fetched 2026-11-19): the web app loads the setting with
 * `safeGet("/settings/user")` and maps `settings.training_allowed === true`
 * to training allowed. The access token comes from `GET /api/auth/session`
 * (`credentials: "include"`). Writes use PATCH `/settings/account_user_setting`,
 * which this detector never calls. The data-controls HTML is a client shell
 * and does not contain the flag, so there is no DOM fallback and no
 * `scripting` permission.
 *
 * The access token lives only in the local variable below for this check.
 * It is not stored, logged, returned, or sent to any host other than chatgpt.com.
 */
export const chatgptDetector: Detector = {
  id: 'chatgpt',
  name: 'ChatGPT',
  settingsUrl: 'https://chatgpt.com/settings/data-controls',
  hostPermission: CHATGPT_HOST_PERMISSION,
  version: CHATGPT_DETECTOR_VERSION,

  async check(): Promise<CheckResult> {
    const granted = await chrome.permissions.contains({ origins: [CHATGPT_HOST_PERMISSION] });
    if (!granted) {
      return unknownResult('Permita a leitura de chatgpt.com para verificar o treinamento.');
    }

    let accessToken: string | undefined;
    try {
      const sessionResponse = await fetch(CHATGPT_SESSION_URL, {
        credentials: 'include',
        redirect: 'error',
        headers: { Accept: 'application/json' },
      });
      const sessionHttp = resultForHttpStatus(sessionResponse.status);
      if (sessionHttp) return sessionHttp;

      const session = classifySession(await readJson(sessionResponse));
      if (session.kind !== 'authenticated') return sessionToResult(session);
      accessToken = session.accessToken;

      const settingsResponse = await fetch(CHATGPT_SETTINGS_URL, {
        credentials: 'include',
        redirect: 'error',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const settingsHttp = resultForHttpStatus(settingsResponse.status);
      if (settingsHttp) return settingsHttp;

      return parseTrainingSettings(await readJson(settingsResponse));
    } catch {
      return unknownResult('Não foi possível consultar o ChatGPT.');
    } finally {
      accessToken = undefined;
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
