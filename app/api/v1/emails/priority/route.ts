import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { withRLSContext } from "@/lib/db-context";
import { apiErrorFromCaught } from "@/lib/api-response";
import { fetchGmailMessages } from "@/lib/adapters/gmail";
import type { NormalizedPriorityEmail } from "@/lib/adapters/email-types";

export const dynamic = "force-dynamic";

/** GET /api/v1/emails/priority - Fetch priority inbox from connected Gmail accounts */
export async function GET() {
  try {
    const user = await getCurrentUser();

    const connections = await withRLSContext(user.id, (tx) =>
      tx.connection.findMany({
        where: {
          userId: user.id,
          provider: "GOOGLE",
          service: "GMAIL",
          status: "CONNECTED",
          isEnabled: true,
          enabledForPriorityInbox: true,
          accessToken: { not: null },
        },
      })
    );

    const allEmails: NormalizedPriorityEmail[] = [];

    for (const conn of connections) {
      if (!conn.accessToken) continue;
      try {
        const emails = await fetchGmailMessages(
          {
            id: conn.id,
            accessToken: conn.accessToken,
            refreshToken: conn.refreshToken,
            tokenExpiresAt: conn.tokenExpiresAt,
            accountEmail: conn.accountEmail,
          },
          { maxResults: 20 }
        );
        allEmails.push(...emails);
      } catch (err) {
        console.error("[emails/priority] fetch failed for", conn.id, err);
      }
    }

    const sorted = allEmails.sort(
      (a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
    );

    const hasGmailConnection = connections.length > 0;

    return NextResponse.json({
      data: { emails: sorted, hasGmailConnection },
    });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}
