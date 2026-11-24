import type { Detector } from './types';
import { chatgptDetector } from './chatgpt';
import { claudeDetector } from './claude';
import { perplexityDetector } from './perplexity';

export const detectors: Detector[] = [
  chatgptDetector,
  claudeDetector,
  perplexityDetector,
  // Adicionar gemini, grok...
];

export function getDetector(id: string): Detector | undefined {
  return detectors.find((d) => d.id === id);
}
