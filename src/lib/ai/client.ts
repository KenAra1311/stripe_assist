import { GoogleGenAI } from '@google/genai';

let geminiClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set in environment variables');
    }
    geminiClient = new GoogleGenAI({ apiKey });
  }
  return geminiClient;
}

export function getModelName(): string {
  return process.env.GEMINI_MODEL || 'gemini-2.5-flash';
}
