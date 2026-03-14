/**
 * OpenAI client for AI pipelines.
 * Returns null when OPENAI_API_KEY is not set (graceful degradation).
 */

import OpenAI from "openai";

let client: OpenAI | null | undefined = undefined;

export function getOpenAIClient(): OpenAI | null {
  if (client !== undefined) return client;
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    client = null;
    return null;
  }
  client = new OpenAI({ apiKey });
  return client;
}

export function isAiEnabled(): boolean {
  return !!process.env.OPENAI_API_KEY?.trim();
}
