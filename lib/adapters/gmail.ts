/**
 * Gmail adapter - fetches messages and normalizes to shared structure.
 * Reusable pattern for future Outlook and Apple Mail adapters.
 * Read-only: no send, modify, or delete.
 */

import { google } from "googleapis";
import { ensureValidGoogleOAuth2Client } from "@/lib/oauth/google-connection-auth";
import type { NormalizedPriorityEmail } from "./email-types";

export interface GmailConnection {
  id: string;
  accessToken: string;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
  accountEmail: string | null;
}

/**
 * Fetch recent inbox messages from Gmail.
 * Normalizes to NormalizedPriorityEmail for Home Priority Emails widget.
 */
export async function fetchGmailMessages(
  conn: GmailConnection,
  options: { maxResults?: number } = {}
): Promise<NormalizedPriorityEmail[]> {
  const auth = await ensureValidGoogleOAuth2Client(conn);
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

/**
 * Gmail HTML → plain for Supra notifications. Table cells become line breaks so
 * "street" / "City, ST ZIP" can land on separate lines (matches parser line-pair logic).
 */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h[1-6]|table)>/gi, "\n")
    .replace(/<\/(td|th)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
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

/** Collect every text/plain and HTML-stripped body (multipart can nest several). */
function gatherMailBodies(part: GmailMessagePart | undefined): {
  plainParts: string[];
  htmlParts: string[];
} {
  const plainParts: string[] = [];
  const htmlParts: string[] = [];

  function walk(p: GmailMessagePart | undefined) {
    if (!p) return;
    if (p.mimeType === "text/plain" && p.body?.data) {
      const t = decodeGmailBodyData(p.body.data).trim();
      if (t) plainParts.push(t);
    } else if (p.mimeType === "text/html" && p.body?.data) {
      const html = decodeGmailBodyData(p.body.data).trim();
      if (html) htmlParts.push(htmlToPlainText(html));
    }
    if (p.parts?.length) {
      for (const c of p.parts) walk(c);
    }
  }

  walk(part);
  return { plainParts, htmlParts };
}

/**
 * Gmail often ships a short text/plain part plus a full HTML body. Supra’s structured copy
 * lives in HTML; taking plain first loses address/time lines. Prefer HTML when it is
 * clearly richer or is the only part that matches Supra’s “showing by” pattern.
 */
export function pickSupraRawBodyFromChunks(
  plainParts: string[],
  htmlParts: string[]
): string {
  const bestPlain = plainParts.reduce((a, b) => (b.length > a.length ? b : a), "").trim();
  const bestHtml = htmlParts.reduce((a, b) => (b.length > a.length ? b : a), "").trim();
  const pLen = bestPlain.length;
  const hLen = bestHtml.length;
  const showingBy = /the\s+showing\s+by\b/i;
  const keyboxOrAt = /\bKeyBox#|\bat\s+\d/i;

  if (!hLen) return bestPlain;
  if (!pLen) return bestHtml;

  if (pLen < 280 && hLen > pLen + 80) return bestHtml;
  if (!showingBy.test(bestPlain) && showingBy.test(bestHtml)) return bestHtml;
  if (!keyboxOrAt.test(bestPlain) && keyboxOrAt.test(bestHtml) && hLen + 40 > pLen) {
    return bestHtml;
  }
  if (pLen < 160 && hLen > pLen + 40) return bestHtml;

  return bestPlain;
}

/**
 * List + fetch Supra-related Gmail messages (read-only).
 * Query matches Supra / Supra Showing senders; last 14 days; plain-text body when possible.
 */
export async function fetchSupraGmailMessages(
  conn: GmailConnection,
  options: { maxResults?: number; query?: string } = {}
): Promise<GmailSupraNormalizedMessage[]> {
  const auth = await ensureValidGoogleOAuth2Client(conn);
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

      const { plainParts, htmlParts } = gatherMailBodies(msg.payload ?? undefined);
      let rawBodyText = pickSupraRawBodyFromChunks(plainParts, htmlParts);
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

const FEEDBACK_REPLY_GMAIL_QUERY = "newer_than:21d in:inbox -from:suprasystems.com -from:suprashowing";
const MAX_FEEDBACK_REPLY_RESULTS = 40;

export type GmailFeedbackReplyCandidate = {
  gmailMessageId: string;
  threadId: string | null;
  subject: string;
  normalizedSubject: string;
  rawBodyText: string;
  sender: string | null;
  senderEmail: string | null;
  receivedAt: Date;
  inReplyTo: string | null;
  references: string | null;
  rfcMessageId: string | null;
};

export function normalizeFeedbackEmailSubject(subject: string): string {
  return subject
    .replace(/^(re|fwd|fw)\s*:\s*/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractEmailAddressFromFromHeader(from: string | null): string | null {
  if (!from) return null;
  const m = from.match(/<([^>]+)>/);
  const raw = (m ? m[1] : from).trim().toLowerCase();
  if (!raw.includes("@")) return null;
  return raw;
}

/**
 * Inbox messages likely to be human replies (not Supra notifications).
 * Used to attach buyer-agent email feedback to showings.
 */
export async function fetchGmailFeedbackReplyCandidates(
  conn: GmailConnection,
  options: { maxResults?: number } = {}
): Promise<GmailFeedbackReplyCandidate[]> {
  const auth = await ensureValidGoogleOAuth2Client(conn);
  const gmail = google.gmail({ version: "v1", auth });

  const maxResults = Math.min(
    options.maxResults ?? MAX_FEEDBACK_REPLY_RESULTS,
    MAX_FEEDBACK_REPLY_RESULTS
  );

  const { data: listData } = await gmail.users.messages.list({
    userId: "me",
    maxResults,
    q: FEEDBACK_REPLY_GMAIL_QUERY,
  });

  const refs = listData.messages ?? [];
  const out: GmailFeedbackReplyCandidate[] = [];

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
      const normalizedSubject = normalizeFeedbackEmailSubject(subject);
      const from = getHeader("From") || null;
      const dateHeader = getHeader("Date");
      const receivedAt = msg.internalDate
        ? new Date(Number(msg.internalDate))
        : dateHeader
          ? new Date(dateHeader)
          : new Date();

      const { plainParts, htmlParts } = gatherMailBodies(msg.payload ?? undefined);
      let rawBodyText = pickSupraRawBodyFromChunks(plainParts, htmlParts);
      if (!rawBodyText.trim()) {
        rawBodyText = (msg.snippet ?? "").trim() || "(Empty body)";
      }
      if (rawBodyText.length > MAX_RAW_BODY_CHARS) {
        rawBodyText = rawBodyText.slice(0, MAX_RAW_BODY_CHARS);
      }

      out.push({
        gmailMessageId: ref.id,
        threadId: msg.threadId ?? null,
        subject,
        normalizedSubject,
        rawBodyText,
        sender: from,
        senderEmail: extractEmailAddressFromFromHeader(from),
        receivedAt,
        inReplyTo: getHeader("In-Reply-To")?.trim() || null,
        references: getHeader("References")?.trim() || null,
        rfcMessageId: getHeader("Message-ID")?.trim() || null,
      });
    } catch (err) {
      console.error("[gmail] fetch feedback reply message failed", ref.id, err);
    }
  }

  return out.sort(
    (a, b) => b.receivedAt.getTime() - a.receivedAt.getTime()
  );
}
