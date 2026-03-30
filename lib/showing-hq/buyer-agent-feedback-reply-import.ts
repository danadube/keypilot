/**
 * Ingest buyer-agent Gmail replies for private showings (feedbackRequestStatus SENT → RECEIVED).
 *
 * Domain model: **Showing** holds buyer-agent feedback workflow (not FollowUpDraft, which is
 * contact follow-up drafts). Ingestion is **thread-scoped**: we only read messages in a Gmail
 * thread tied to the sent feedback email (discovered from Sent mail or supplied via PATCH).
 */

import { prismaAdmin } from "@/lib/db";
import {
  discoverFeedbackThreadFromSentMail,
  extractEmailAddressFromFromHeader,
  fetchGmailThreadMessagesForFeedback,
  isBlockedFeedbackSystemSender,
  type GmailConnection,
} from "@/lib/adapters/gmail";
import { parseBuyerAgentReplyLight } from "@/lib/showing-hq/buyer-agent-reply-parse";

function normEmail(s: string | null | undefined): string | null {
  const t = s?.trim().toLowerCase();
  return t || null;
}

function baselineSendWindowStart(
  feedbackEmailSentAt: Date | null,
  feedbackDraftGeneratedAt: Date | null,
  scheduledAt: Date
): Date {
  const d = feedbackEmailSentAt ?? feedbackDraftGeneratedAt ?? scheduledAt;
  return new Date(d.getTime() - 2 * 24 * 60 * 60 * 1000);
}

/**
 * @returns scanned = thread fetches attempted for a pending showing; matched = showings updated with reply.
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
      feedbackGmailThreadId: true,
      feedbackSentRfcMessageId: true,
    },
  });

  const pending = pendingRows.filter(
    (p) => p.buyerAgentEmail != null && p.buyerAgentEmail.trim() !== ""
  );

  let scanned = 0;
  let matched = 0;
  let skipped = 0;
  const processedShowingIds = new Set<string>();

  for (const showing of pending) {
    if (processedShowingIds.has(showing.id)) continue;

    let threadId = showing.feedbackGmailThreadId?.trim() ?? null;
    let sentRfc = showing.feedbackSentRfcMessageId?.trim() ?? null;

    if (!threadId) {
      for (const conn of connections) {
        try {
          const disc = await discoverFeedbackThreadFromSentMail(conn, {
            buyerEmail: showing.buyerAgentEmail!,
            draftSubject: showing.feedbackDraftSubject,
          });
          if (disc) {
            threadId = disc.threadId;
            sentRfc = disc.rfcMessageId ?? sentRfc;
            await prismaAdmin.showing.update({
              where: { id: showing.id },
              data: {
                feedbackGmailThreadId: threadId,
                feedbackSentRfcMessageId: sentRfc,
              },
            });
            break;
          }
        } catch (e) {
          console.error("[buyer-agent-reply-import] discover_thread_failed", {
            showingId: showing.id,
            connectionId: conn.id,
            message: e instanceof Error ? e.message : String(e),
          });
        }
      }
    }

    if (!threadId) {
      console.error("[buyer-agent-reply-import] skip_no_thread", {
        showingId: showing.id,
        message:
          "No Gmail thread id for this feedback request (send from a Gmail account connected to KeyPilot, or set thread id via API).",
      });
      continue;
    }

    const buyerEmail = normEmail(showing.buyerAgentEmail);
    if (!buyerEmail) {
      skipped += 1;
      continue;
    }

    const baseline = baselineSendWindowStart(
      showing.feedbackEmailSentAt,
      showing.feedbackDraftGeneratedAt,
      showing.scheduledAt
    );

    let messages: Awaited<ReturnType<typeof fetchGmailThreadMessagesForFeedback>> | null = null;
    let usedConn: GmailConnection | null = null;
    for (const conn of connections) {
      try {
        messages = await fetchGmailThreadMessagesForFeedback(conn, threadId);
        usedConn = conn;
        break;
      } catch (e) {
        console.error("[buyer-agent-reply-import] thread_fetch_failed_retry", {
          showingId: showing.id,
          threadId,
          connectionId: conn.id,
          message: e instanceof Error ? e.message : String(e),
        });
      }
    }

    if (!messages || !usedConn) {
      console.error("[buyer-agent-reply-import] skip_thread_fetch_exhausted", {
        showingId: showing.id,
        threadId,
      });
      skipped += 1;
      continue;
    }

    scanned += 1;

    const accountEmail = normEmail(usedConn.accountEmail);

    const agentMessages = messages.filter((m) => {
      if (!m.senderEmail) return false;
      if (m.senderEmail !== buyerEmail) return false;
      if (isBlockedFeedbackSystemSender(m.senderEmail)) return false;
      if (accountEmail && m.senderEmail === accountEmail) return false;
      if (m.receivedAt.getTime() < baseline.getTime()) return false;
      if (!m.rawBodyText.trim() || m.rawBodyText === "(Empty body)") return false;
      return true;
    });

    if (agentMessages.length === 0) {
      console.error("[buyer-agent-reply-import] skip_no_agent_message_in_thread", {
        showingId: showing.id,
        threadId,
        messageCount: messages.length,
      });
      skipped += 1;
      continue;
    }

    const latest = agentMessages.reduce((a, b) =>
      a.receivedAt.getTime() >= b.receivedAt.getTime() ? a : b
    );

    const dup = await prismaAdmin.showing.findFirst({
      where: { buyerAgentEmailReplyGmailId: latest.gmailMessageId },
      select: { id: true },
    });
    if (dup && dup.id !== showing.id) {
      skipped += 1;
      continue;
    }

    const parsed = parseBuyerAgentReplyLight(latest.rawBodyText);
    const fromDisp = latest.fromHeader ?? extractEmailAddressFromFromHeader(latest.fromHeader) ?? "";

    const updated = await prismaAdmin.showing.updateMany({
      where: {
        id: showing.id,
        hostUserId,
        feedbackRequestStatus: "SENT",
        buyerAgentEmailReplyAt: null,
      },
      data: {
        buyerAgentEmailReplyRaw: latest.rawBodyText,
        buyerAgentEmailReplyAt: latest.receivedAt,
        buyerAgentEmailReplyFrom: fromDisp.slice(0, 500),
        buyerAgentEmailReplyGmailId: latest.gmailMessageId,
        ...(parsed ? { buyerAgentEmailReplyParsed: parsed as object } : {}),
        feedbackRequestStatus: "RECEIVED",
      },
    });

    if (updated.count === 1) {
      matched += 1;
      processedShowingIds.add(showing.id);
    } else {
      skipped += 1;
    }
  }

  return { scanned, matched, skipped };
}
