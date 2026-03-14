/**
 * Gmail adapter - fetches messages and normalizes to shared structure.
 * Reusable pattern for future Outlook and Apple Mail adapters.
 * Read-only: no send, modify, or delete.
 */

import { google } from "googleapis";
import type { NormalizedPriorityEmail } from "./email-types";

export interface GmailConnection {
  id: string;
  accessToken: string;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
  accountEmail: string | null;
}

function getOAuth2Client(conn: GmailConnection) {
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/v1/auth/google/callback`
  );

  oauth2.setCredentials({
    access_token: conn.accessToken,
    refresh_token: conn.refreshToken ?? undefined,
    expiry_date: conn.tokenExpiresAt?.getTime(),
  });

  return oauth2;
}

async function ensureValidToken(conn: GmailConnection) {
  const oauth2 = getOAuth2Client(conn);
  const now = Date.now();
  const expiresAt = conn.tokenExpiresAt?.getTime() ?? 0;
  if (expiresAt > 0 && now >= expiresAt - 5 * 60 * 1000) {
    await oauth2.refreshAccessToken();
  }
  return oauth2;
}

/**
 * Fetch recent inbox messages from Gmail.
 * Normalizes to NormalizedPriorityEmail for Home Priority Emails widget.
 */
export async function fetchGmailMessages(
  conn: GmailConnection,
  options: { maxResults?: number } = {}
): Promise<NormalizedPriorityEmail[]> {
  const auth = await ensureValidToken(conn);
  const gmail = google.gmail({ version: "v1", auth });

  const maxResults = options.maxResults ?? 20;

  const { data: listData } = await gmail.users.messages.list({
    userId: "me",
    maxResults,
    labelIds: ["INBOX"],
    q: "is:unread OR in:inbox",
  });

  const messages = listData.messages ?? [];
  const emails: NormalizedPriorityEmail[] = [];

  for (const msgRef of messages) {
    if (!msgRef.id) continue;
    try {
      const { data: msg } = await gmail.users.messages.get({
        userId: "me",
        id: msgRef.id,
        format: "metadata",
        metadataHeaders: ["From", "Subject", "Date"],
      });

      const headers = msg.payload?.headers ?? [];
      const getHeader = (name: string) =>
        headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? "";

      const from = getHeader("From");
      const subject = getHeader("Subject");
      const dateStr = getHeader("Date");
      const snippet = msg.snippet ?? "";
      const labelIds = msg.labelIds ?? [];
      const unread = labelIds.includes("UNREAD");

      const receivedAt = msg.internalDate
        ? new Date(Number(msg.internalDate)).toISOString()
        : dateStr
          ? new Date(dateStr).toISOString()
          : new Date().toISOString();

      emails.push({
        id: `gmail-${conn.id}-${msgRef.id}`,
        connectionId: conn.id,
        provider: "google",
        accountEmail: conn.accountEmail,
        sender: from,
        subject: subject || "(No subject)",
        snippet,
        receivedAt,
        threadId: msg.threadId ?? msgRef.id,
        labels: labelIds,
        unread,
        href: `https://mail.google.com/mail/u/0/#inbox/${msg.threadId ?? msgRef.id}`,
      });
    } catch (err) {
      console.error("[gmail] fetch message failed", msgRef.id, err);
    }
  }

  return emails.sort(
    (a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
  );
}
