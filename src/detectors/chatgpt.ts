import type { Detector, CheckResult } from './types';

/**
 * Detector do ChatGPT
 * Página: https://chatgpt.com/settings/data-controls
 * Toggle: "Improve the model for everyone"
 *
 * MVP: versão skeleton. Na implementação real:
 * 1. Tentar fetch autenticado de endpoint interno (se conhecido)
 * 2. Fallback: chrome.scripting.executeScript na página de settings
 */
export const chatgptDetector: Detector = {
  id: 'chatgpt',
  name: 'ChatGPT',
  settingsUrl: 'https://chatgpt.com/settings/data-controls',
  hostPermission: 'https://chatgpt.com/*',

  async check(): Promise<CheckResult> {
    // TODO: implementar leitura real
    // Exemplo de estrutura esperada:
    // - Verificar se usuário está logado
    // - Ler estado do toggle "Improve the model for everyone"
    // - Retornar 'on' | 'off' | 'not-logged-in' | 'unknown'

    return {
      status: 'unknown',
      confidence: 0,
      message: 'Detector ainda não implementado (MVP skeleton)',
    };
  },
};
