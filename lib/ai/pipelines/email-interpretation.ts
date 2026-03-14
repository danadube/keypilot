/**
 * Email interpretation pipeline: summarize + classify.
 * Uses OpenAI to add aiSummary and classification to NormalizedPriorityEmail.
 * Conservative: falls back to snippet / informational when AI unavailable.
 */

import { getOpenAIClient } from "../openai-client";
import type { NormalizedPriorityEmail } from "@/lib/adapters/email-types";

const BATCH_SIZE = 8;
const MODEL = "gpt-4o-mini";

export type InterpretedEmail = NormalizedPriorityEmail & {
  aiSummary?: string;
  classification: "needs_reply" | "informational" | "waiting";
};

function formatEmailForPrompt(e: NormalizedPriorityEmail): string {
  return `From: ${e.sender}\nSubject: ${e.subject}\nSnippet: ${e.snippet.slice(0, 300)}`;
}

/**
 * Interpret emails: add AI summary and classification.
 * Returns same emails with aiSummary and classification populated.
 * When AI is disabled, uses snippet as summary and defaults to informational.
 */
export async function interpretEmails(
  emails: NormalizedPriorityEmail[]
): Promise<InterpretedEmail[]> {
  const openai = getOpenAIClient();
  if (!openai || emails.length === 0) {
    return emails.map((e) => ({
      ...e,
      classification: (e.classification ?? "informational") as InterpretedEmail["classification"],
    }));
  }

  const results: InterpretedEmail[] = [];

  for (let i = 0; i < emails.length; i += BATCH_SIZE) {
    const batch = emails.slice(i, i + BATCH_SIZE);
    const batchWithIndices = batch.map((e, idx) => ({
      idx: i + idx,
      email: e,
      text: formatEmailForPrompt(e),
    }));

    const prompt = `You are a real estate assistant. For each email below, produce:
1. A 1-2 sentence summary (what the email is about).
2. A classification: "needs_reply" (requires a reply from the agent), "informational" (FYI only), or "waiting" (we're waiting on someone else).

Emails (numbered 0 to ${batch.length - 1}):
${batchWithIndices.map((b) => `--- Email ${b.idx} ---\n${b.text}`).join("\n\n")}

Respond with valid JSON only, no markdown:
{ "results": [ { "idx": 0, "summary": "...", "classification": "needs_reply|informational|waiting" }, ... ] }`;

    try {
      const resp = await openai.chat.completions.create({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 600,
        temperature: 0.2,
      });

      const raw = resp.choices?.[0]?.message?.content?.trim();
      if (!raw) throw new Error("Empty response");

      const parsed = JSON.parse(raw.replace(/```json?\s*/i, "").replace(/```\s*$/i, "")) as {
        results?: { idx: number; summary: string; classification: string }[];
      };
      const aiResults = parsed.results ?? [];

      for (let j = 0; j < batch.length; j++) {
        const e = batch[j];
        const ai = aiResults.find((r) => r.idx === i + j);
        const classification = (
          ai?.classification === "needs_reply" ||
          ai?.classification === "informational" ||
          ai?.classification === "waiting"
        )
          ? ai.classification
          : "informational";

        results.push({
          ...e,
          aiSummary: ai?.summary ?? e.snippet?.slice(0, 120) ?? undefined,
          classification: classification as InterpretedEmail["classification"],
        });
      }
    } catch (err) {
      console.error("[ai/email-interpretation] batch failed", err);
      for (const e of batch) {
        results.push({
          ...e,
          aiSummary: e.snippet?.slice(0, 120) ?? undefined,
          classification: (e.classification ?? "informational") as InterpretedEmail["classification"],
        });
      }
    }
  }

  return results;
}
