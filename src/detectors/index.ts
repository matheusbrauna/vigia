import type { Detector } from './types';
import { chatgptDetector } from './chatgpt';

export const detectors: Detector[] = [
  chatgptDetector,
  // Adicionar claude, perplexity, gemini, grok...
];

export function getDetector(id: string): Detector | undefined {
  return detectors.find((d) => d.id === id);
}
