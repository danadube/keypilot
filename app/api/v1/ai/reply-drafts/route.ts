/**
 * Reply drafts API — generate suggested replies for needs_reply emails.
 * Lazy-loaded: client passes email context, no Gmail re-fetch.
 * Review-first only: no send, no Gmail draft creation.
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { apiErrorFromCaught } from "@/lib/api-response";
import { generateReplyDrafts } from "@/lib/ai/pipelines/reply-drafts";

export const dynamic = "force-dynamic";

/** POST /api/v1/ai/reply-drafts — Generate drafts for one email */
export async function POST(req: NextRequest) {
  try {
    await getCurrentUser();

    const body = await req.json();
    const { emailId, threadId, sender, subject, snippet, aiSummary } = body ?? {};

    if (!emailId || !threadId || !sender || !subject || typeof snippet !== "string") {
      return NextResponse.json(
        { error: { message: "Missing required fields: emailId, threadId, sender, subject, snippet" } },
        { status: 400 }
      );
    }

    const drafts = await generateReplyDrafts({
      id: String(emailId),
      threadId: String(threadId),
      sender: String(sender),
      subject: String(subject),
      snippet: String(snippet),
      aiSummary: aiSummary ? String(aiSummary) : undefined,
    });

    return NextResponse.json({ data: { drafts } });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}
