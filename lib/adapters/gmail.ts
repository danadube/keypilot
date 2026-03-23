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

/** Gmail search: Supra / Supra Showing notification senders, last 14 days. */
const SUPRA_GMAIL_QUERY_BASE =
  "newer_than:14d (from:suprasystems.com OR from:suprashowing)";

const MAX_SUPRA_GMAIL_RESULTS = 50;
const MAX_RAW_BODY_CHARS = 500_000;

export type GmailSupraNormalizedMessage = {
  gmailMessageId: string;
  subject: string;
  rawBodyText: string;
  sender: string | null;
  receivedAt: Date;
};

function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+\n/g, "\n")
    .trim();
}

function decodeGmailBodyData(data: string): string {
  try {
    return Buffer.from(data, "base64url").toString("utf-8");
  } catch {
    return "";
  }
}

type GmailMessagePart = {
  mimeType?: string | null;
  body?: { data?: string | null };
  parts?: GmailMessagePart[] | null;
};

/** Walk Gmail message parts for best available plain text (fallback HTML → stripped). */
function extractPlainBodyFromPart(part: GmailMessagePart): string {
  if (!part) return "";
  if (part.mimeType === "text/plain" && part.body?.data) {
    const t = decodeGmailBodyData(part.body.data);
    if (t.trim()) return t;
  }
  if (part.parts?.length) {
    for (const p of part.parts) {
      const t = extractPlainBodyFromPart(p);
      if (t.trim()) return t;
    }
    for (const p of part.parts) {
      if (p.mimeType === "text/html" && p.body?.data) {
        const html = decodeGmailBodyData(p.body.data);
        if (html.trim()) return htmlToPlainText(html);
      }
    }
  }
  return "";
}

/**
 * List + fetch Supra-related Gmail messages (read-only).
 * Query matches Supra / Supra Showing senders; last 14 days; plain-text body when possible.
 */
export async function fetchSupraGmailMessages(
  conn: GmailConnection,
  options: { maxResults?: number; query?: string } = {}
): Promise<GmailSupraNormalizedMessage[]> {
  const auth = await ensureValidToken(conn);
  const gmail = google.gmail({ version: "v1", auth });

  const maxResults = Math.min(
    options.maxResults ?? MAX_SUPRA_GMAIL_RESULTS,
    MAX_SUPRA_GMAIL_RESULTS
  );
  const q = options.query ?? SUPRA_GMAIL_QUERY_BASE;

  const { data: listData } = await gmail.users.messages.list({
    userId: "me",
    maxResults,
    q,
  });

  const refs = listData.messages ?? [];
  const out: GmailSupraNormalizedMessage[] = [];

  for (const ref of refs) {
    if (!ref.id) continue;
    try {
      const { data: msg } = await gmail.users.messages.get({
        userId: "me",
        id: ref.id,
        format: "full",
      });

      const headers = msg.payload?.headers ?? [];
      const getHeader = (name: string) =>
        headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? "";

      const subject = (getHeader("Subject") || "(No subject)").slice(0, 500);
      const from = getHeader("From") || null;
      const dateHeader = getHeader("Date");
      const receivedAt = msg.internalDate
        ? new Date(Number(msg.internalDate))
        : dateHeader
          ? new Date(dateHeader)
          : new Date();

      let rawBodyText = msg.payload
        ? extractPlainBodyFromPart(msg.payload)
        : "";
      if (!rawBodyText.trim()) {
        rawBodyText = (msg.snippet ?? "").trim() || "(Empty body)";
      }
      if (rawBodyText.length > MAX_RAW_BODY_CHARS) {
        rawBodyText = rawBodyText.slice(0, MAX_RAW_BODY_CHARS);
      }

      out.push({
        gmailMessageId: ref.id,
        subject,
        rawBodyText,
        sender: from,
        receivedAt,
      });
    } catch (err) {
      console.error("[gmail] fetch Supra message failed", ref.id, err);
    }
  }

  return out.sort(
    (a, b) => b.receivedAt.getTime() - a.receivedAt.getTime()
  );
}
