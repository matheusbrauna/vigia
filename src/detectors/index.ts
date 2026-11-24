import type { Detector } from './types';
import { chatgptDetector } from './chatgpt';
import { claudeDetector } from './claude';

export const detectors: Detector[] = [
  chatgptDetector,
  claudeDetector,
  // Adicionar perplexity, gemini, grok...
];

export function getDetector(id: string): Detector | undefined {
  return detectors.find((d) => d.id === id);
}
