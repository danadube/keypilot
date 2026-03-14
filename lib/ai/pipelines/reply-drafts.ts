/**
 * Reply draft pipeline: generate AI suggested replies for needs_reply emails.
 * Review-first: no send, no Gmail draft save. Produces drafts for user review.
 */

import { getOpenAIClient } from "../openai-client";
import type { SuggestedReplyDraft } from "../types";

const MODEL = "gpt-4o-mini";

export type EmailContextForDraft = {
  id: string;
  threadId: string;
  sender: string;
  subject: string;
  snippet: string;
  aiSummary?: string;
};

/**
 * Generate suggested reply drafts for an email that needs a reply.
 * Returns 1–2 drafts (short + optional polished). Fails gracefully when AI unavailable.
 */
export async function generateReplyDrafts(
  email: EmailContextForDraft
): Promise<SuggestedReplyDraft[]> {
  const openai = getOpenAIClient();
  if (!openai) return [];

  const prompt = `You are a professional real estate assistant. Generate reply drafts for this email.

Email:
From: ${email.sender}
Subject: ${email.subject}
Snippet: ${email.snippet.slice(0, 400)}
${email.aiSummary ? `Summary: ${email.aiSummary}` : ""}

Generate 1–2 reply drafts:
1. "short" – brief, friendly, 2–4 sentences
2. "polished" (optional) – slightly more formal if useful for this context

Respond with valid JSON only, no markdown:
{
  "drafts": [
    { "draftType": "short", "body": "...", "rationale": "Brief intent or tone" },
    { "draftType": "polished", "body": "...", "rationale": "..." }
  ]
}
Use Re: ${email.subject} as the subject line for replies. Keep body concise and professional.`;

  try {
    const resp = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 600,
      temperature: 0.3,
    });

    const raw = resp.choices?.[0]?.message?.content?.trim();
    if (!raw) return [];

    const parsed = JSON.parse(raw.replace(/```json?\s*/i, "").replace(/```\s*$/i, "")) as {
      drafts?: { draftType: string; body: string; rationale?: string }[];
    };
    const drafts = parsed.drafts ?? [];

    return drafts.slice(0, 2).map((d, i) => ({
      id: `draft-${email.id}-${i}-${Date.now()}`,
      emailId: email.id,
      threadId: email.threadId,
      draftType: d.draftType === "polished" ? "polished" : "short",
      subjectSuggestion: `Re: ${email.subject}`,
      body: d.body?.trim() ?? "",
      rationale: d.rationale?.trim(),
      suggestedAt: new Date().toISOString(),
      status: "draft" as const,
    }));
  } catch (err) {
    console.error("[ai/reply-drafts] generation failed", err);
    return [];
  }
}
