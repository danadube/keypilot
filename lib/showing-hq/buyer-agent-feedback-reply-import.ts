/**
 * Match buyer-agent Gmail replies to showings awaiting email feedback (status SENT).
 * Uses multiple signals (sender, subject overlap, timing) — not a single header rule.
 */

import { prismaAdmin } from "@/lib/db";
import {
  extractEmailAddressFromFromHeader,
  fetchGmailFeedbackReplyCandidates,
  normalizeFeedbackEmailSubject,
  type GmailConnection,
  type GmailFeedbackReplyCandidate,
} from "@/lib/adapters/gmail";
import { parseBuyerAgentReplyLight } from "@/lib/showing-hq/buyer-agent-reply-parse";

function normEmail(s: string | null | undefined): string | null {
  const t = s?.trim().toLowerCase();
  return t || null;
}

function tokenizeSubject(text: string): Set<string> {
  const n = normalizeFeedbackEmailSubject(text).toLowerCase();
  return new Set(n.split(/[^a-z0-9+#]+/).filter((t) => t.length > 2));
}

function subjectTokenOverlap(a: string, b: string): number {
  if (!a.trim() || !b.trim()) return 0;
  const ta = tokenizeSubject(a);
  const tb = tokenizeSubject(b);
  let c = 0;
  ta.forEach((t) => {
    if (tb.has(t)) c += 1;
  });
  return c;
}

type MatchCandidate = {
  id: string;
  buyerAgentEmail: string;
  feedbackDraftSubject: string | null;
  feedbackEmailSentAt: Date | null;
  feedbackDraftGeneratedAt: Date | null;
  scheduledAt: Date;
  property: { address1: string | null; city: string | null };
};

function baselineSendWindowStart(s: MatchCandidate): Date {
  const d =
    s.feedbackEmailSentAt ?? s.feedbackDraftGeneratedAt ?? s.scheduledAt;
  return new Date(d.getTime() - 2 * 24 * 60 * 60 * 1000);
}

/**
 * @returns score -1 = no match; higher is better
 */
function scoreMessageForShowing(
  msg: GmailFeedbackReplyCandidate,
  s: MatchCandidate
): number {
  const from = msg.senderEmail;
  if (!from) return -1;
  const agent = normEmail(s.buyerAgentEmail);
  if (!agent || agent !== from) return -1;

  let score = 5;
  const draftSub = s.feedbackDraftSubject ?? "";
  const ovDraft = subjectTokenOverlap(msg.normalizedSubject, draftSub);
  const addr = [s.property.address1, s.property.city].filter(Boolean).join(" ");
  const ovAddr = subjectTokenOverlap(msg.normalizedSubject, addr);

  if (ovDraft >= 2) score += 4;
  else if (ovDraft === 1) score += 2;
  if (ovAddr >= 1) score += 2;

  const baseline = baselineSendWindowStart(s);
  if (msg.receivedAt.getTime() < baseline.getTime()) return -1;

  const sentish = s.feedbackEmailSentAt ?? s.feedbackDraftGeneratedAt;
  if (sentish && msg.receivedAt.getTime() >= sentish.getTime() - 5 * 60 * 1000) {
    score += 1;
  }

  if (ovDraft === 0 && ovAddr === 0) {
    score -= 2;
  }

  if (score < 6) return -1;
  return score;
}

function pickBestShowing(
  msg: GmailFeedbackReplyCandidate,
  rows: MatchCandidate[]
): { row: MatchCandidate; score: number } | null {
  let best: { row: MatchCandidate; score: number } | null = null;
  for (const s of rows) {
    const sc = scoreMessageForShowing(msg, s);
    if (sc < 0) continue;
    if (!best || sc > best.score) best = { row: s, score: sc };
  }
  return best;
}

/**
 * Read inbox for Gmail-connected user; attach replies to matching showings.
 * Idempotent via buyerAgentEmailReplyGmailId + updateMany guard.
 */
export async function runBuyerAgentFeedbackReplyImportForUser(
  hostUserId: string
): Promise<{ scanned: number; matched: number; skipped: number }> {
  const connections: GmailConnection[] = (
    await prismaAdmin.connection.findMany({
      where: {
        userId: hostUserId,
        provider: "GOOGLE",
        service: "GMAIL",
        status: "CONNECTED",
        isEnabled: true,
        accessToken: { not: null },
      },
    })
  ).map((c) => ({
    id: c.id,
    accessToken: c.accessToken!,
    refreshToken: c.refreshToken,
    tokenExpiresAt: c.tokenExpiresAt,
    accountEmail: c.accountEmail,
  }));

  if (connections.length === 0) {
    return { scanned: 0, matched: 0, skipped: 0 };
  }

  let scanned = 0;
  let matched = 0;
  let skipped = 0;

  for (const conn of connections) {
    let messages: GmailFeedbackReplyCandidate[];
    try {
      messages = await fetchGmailFeedbackReplyCandidates(conn);
    } catch (e) {
      console.error("[buyer-agent-reply-import] fetch failed", conn.id, e);
      continue;
    }

    for (const msg of messages) {
      if (!msg.rawBodyText.trim() || msg.rawBodyText === "(Empty body)") continue;

      const dup = await prismaAdmin.showing.findFirst({
        where: { buyerAgentEmailReplyGmailId: msg.gmailMessageId },
        select: { id: true },
      });
      if (dup) {
        skipped += 1;
        continue;
      }

      scanned += 1;

      const pendingRows = await prismaAdmin.showing.findMany({
        where: {
          hostUserId,
          deletedAt: null,
          feedbackRequestStatus: "SENT",
          buyerAgentEmail: { not: null },
          buyerAgentEmailReplyAt: null,
        },
        select: {
          id: true,
          buyerAgentEmail: true,
          feedbackDraftSubject: true,
          feedbackEmailSentAt: true,
          feedbackDraftGeneratedAt: true,
          scheduledAt: true,
          property: { select: { address1: true, city: true } },
        },
      });

      const pending: MatchCandidate[] = pendingRows
        .filter((p) => p.buyerAgentEmail != null && p.buyerAgentEmail.trim() !== "")
        .map((p) => ({ ...p, buyerAgentEmail: p.buyerAgentEmail! }));

      const pick = pickBestShowing(msg, pending);
      if (!pick) continue;

      const parsed = parseBuyerAgentReplyLight(msg.rawBodyText);
      const fromDisp = msg.sender ?? extractEmailAddressFromFromHeader(msg.sender) ?? "";

      const updated = await prismaAdmin.showing.updateMany({
        where: {
          id: pick.row.id,
          hostUserId,
          feedbackRequestStatus: "SENT",
          buyerAgentEmailReplyAt: null,
        },
        data: {
          buyerAgentEmailReplyRaw: msg.rawBodyText,
          buyerAgentEmailReplyAt: msg.receivedAt,
          buyerAgentEmailReplyFrom: fromDisp.slice(0, 500),
          buyerAgentEmailReplyGmailId: msg.gmailMessageId,
          ...(parsed ? { buyerAgentEmailReplyParsed: parsed as object } : {}),
          feedbackRequestStatus: "RECEIVED",
        },
      });

      if (updated.count === 1) matched += 1;
      else skipped += 1;
    }
  }

  return { scanned, matched, skipped };
}
