/**
 * Pull recent Supra-related messages from connected Gmail into the Supra review queue.
 * New messages create INGESTED rows. Existing rows (except APPLIED / DUPLICATE) get
 * `rawBodyText` + headers refreshed from Gmail so re-import picks up improved extraction.
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prismaAdmin } from "@/lib/db";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import { fetchSupraGmailMessages } from "@/lib/adapters/gmail";
import { applySupraV1ParseDraftToQueueItem } from "@/lib/showing-hq/supra-queue-apply-parse-draft";
import { ingestSupraQueueItemIfNew } from "@/lib/showing-hq/supra-queue-ingest";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const user = await getCurrentUser();

    const connections = await prismaAdmin.connection.findMany({
      where: {
        userId: user.id,
        provider: "GOOGLE",
        service: "GMAIL",
        status: "CONNECTED",
        isEnabled: true,
        accessToken: { not: null },
      },
    });

    if (connections.length === 0) {
      return apiError(
        "No active Gmail connection. Connect Gmail under Settings → Connections.",
        400,
        "GMAIL_NOT_CONNECTED"
      );
    }

    let imported = 0;
    let skipped = 0;
    let refreshed = 0;
    let autoParsed = 0;
    const seenGmailIds = new Set<string>();

    for (const conn of connections) {
      if (!conn.accessToken) continue;
      const gmailConn = {
        id: conn.id,
        accessToken: conn.accessToken,
        refreshToken: conn.refreshToken,
        tokenExpiresAt: conn.tokenExpiresAt,
        accountEmail: conn.accountEmail,
      };

      let messages;
      try {
        messages = await fetchSupraGmailMessages(gmailConn);
      } catch (e) {
        console.error("[import-gmail] fetch failed for connection", conn.id, e);
        continue;
      }

      for (const m of messages) {
        if (seenGmailIds.has(m.gmailMessageId)) continue;
        seenGmailIds.add(m.gmailMessageId);

        const externalMessageId = `gmail-${m.gmailMessageId}`;
        const { status, queueItemId } = await ingestSupraQueueItemIfNew(user.id, {
          externalMessageId,
          subject: m.subject,
          rawBodyText: m.rawBodyText,
          sender: m.sender,
          receivedAt: m.receivedAt,
        });
        if (status === "imported") imported += 1;
        else if (status === "refreshed") refreshed += 1;
        else skipped += 1;

        if (queueItemId && (status === "imported" || status === "refreshed")) {
          try {
            const pr = await applySupraV1ParseDraftToQueueItem({
              hostUserId: user.id,
              queueItemId,
            });
            if (pr.ok) autoParsed += 1;
          } catch (e) {
            console.error("[import-gmail] auto-parse failed", queueItemId, e);
          }
        }
      }
    }

    return NextResponse.json({
      data: {
        imported,
        refreshed,
        skipped,
        autoParsed,
        scanned: seenGmailIds.size,
      },
    });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}
