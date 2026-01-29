import { Ollama } from 'ollama';

let ollamaClient: Ollama | null = null;

export function getOllamaClient(): Ollama {
  if (!ollamaClient) {
    const host = process.env.OLLAMA_HOST || 'http://localhost:11434';
    ollamaClient = new Ollama({ host });
  }
  return ollamaClient;
}

export function getModelName(): string {
  return process.env.OLLAMA_MODEL || 'llama3.1';
}
