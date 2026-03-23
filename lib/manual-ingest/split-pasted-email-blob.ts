/**
 * Conservative extraction of Subject / From / Date from a pasted email blob (manual ingest).
 * Does not call external services. Does not invent values — only fills when headers parse cleanly.
 *
 * rawBodyText for the queue should remain the full original paste so parser testing keeps full source.
 */

const EMAIL_IN_ANGLE = /<([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>/;
const EMAIL_STANDALONE = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/;

/** Headers that can start a recognizable mail/MIME header block (case-insensitive). */
const HEADER_BLOCK_START_KEYS = new Set([
  "delivered-to",
  "received",
  "return-path",
  "from",
  "to",
  "subject",
  "date",
  "sent",
  "reply-to",
  "cc",
  "bcc",
  "message-id",
  "mime-version",
  "content-type",
  "dkim-signature",
]);

export type SplitPastedEmailBlobDetected = {
  subject: boolean;
  sender: boolean;
  receivedAt: boolean;
};

export type SplitPastedEmailBlobResult = {
  /** Always the normalized full input — use as rawBodyText when ingesting. */
  fullText: string;
  subject: string | null;
  sender: string | null;
  receivedAt: Date | null;
  detected: SplitPastedEmailBlobDetected;
};

function normalizeNewlines(raw: string): string {
  return raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function parseFromValue(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  const angle = v.match(EMAIL_IN_ANGLE);
  if (angle) return angle[1].trim();
  const standalone = v.match(EMAIL_STANDALONE);
  if (standalone) return standalone[0].trim();
  return null;
}

function parseDateHeaderValue(value: string): Date | null {
  const v = value.trim();
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

/**
 * Parse leading header block: lines are "Name: value" or folded continuations (leading whitespace).
 * Stops at first empty line after at least one header was collected.
 */
function parseHeaderBlock(lines: string[]): { headers: Map<string, string>; endLineIndex: number } | null {
  let i = 0;
  while (i < lines.length && lines[i].trim() === "") i++;

  const headers = new Map<string, string>();
  const headerLine = /^([A-Za-z][A-Za-z0-9-]*)\s*:\s*(.*)$/;

  let started = false;

  for (; i < lines.length; i++) {
    const line = lines[i];
    const trimmedEnd = line.trimEnd();

    if (trimmedEnd === "") {
      if (started && headers.size > 0) {
        return { headers, endLineIndex: i + 1 };
      }
      continue;
    }

    const hm = trimmedEnd.match(headerLine);
    if (hm) {
      const key = hm[1].toLowerCase();
      const val = hm[2].trimEnd();
      if (!started) {
        if (!HEADER_BLOCK_START_KEYS.has(key)) {
          return null;
        }
        started = true;
      }
      headers.set(key, val);
      continue;
    }

    if (started && headers.size > 0 && /^[ \t]/.test(line)) {
      const keys = Array.from(headers.keys());
      const lastKey = keys[keys.length - 1]!;
      const prev = headers.get(lastKey) ?? "";
      headers.set(lastKey, `${prev} ${trimmedEnd.trim()}`.trim());
      continue;
    }

    if (started && headers.size > 0) {
      return { headers, endLineIndex: i };
    }

    return null;
  }

  if (started && headers.size > 0) {
    return { headers, endLineIndex: lines.length };
  }
  return null;
}

function headerBlockLooksLikeMailHeaders(headers: Map<string, string>): boolean {
  if (headers.has("subject")) return true;
  if (headers.size >= 2) return true;
  return false;
}

/**
 * If the clipboard looks like a pasted email with a leading header block, extract
 * subject, sender (email), and received time (Date: or Sent:).
 * Always returns fullText unchanged for storage as rawBodyText.
 */
export function splitPastedEmailBlob(raw: string): SplitPastedEmailBlobResult {
  const fullText = normalizeNewlines(raw);
  const lines = fullText.split("\n");

  const block = parseHeaderBlock(lines);
  const detected: SplitPastedEmailBlobDetected = {
    subject: false,
    sender: false,
    receivedAt: false,
  };

  if (!block || !headerBlockLooksLikeMailHeaders(block.headers)) {
    return {
      fullText,
      subject: null,
      sender: null,
      receivedAt: null,
      detected,
    };
  }

  const { headers } = block;

  let subject: string | null = null;
  const subj = headers.get("subject");
  if (subj?.trim()) {
    subject = subj.trim();
    detected.subject = true;
  }

  let sender: string | null = null;
  const fromVal = headers.get("from");
  if (fromVal) {
    const em = parseFromValue(fromVal);
    if (em) {
      sender = em;
      detected.sender = true;
    }
  }

  let receivedAt: Date | null = null;
  const dateVal = headers.get("date") ?? headers.get("sent");
  if (dateVal) {
    const d = parseDateHeaderValue(dateVal);
    if (d) {
      receivedAt = d;
      detected.receivedAt = true;
    }
  }

  return {
    fullText,
    subject,
    sender,
    receivedAt,
    detected,
  };
}

/** True if split found at least one field worth applying in the UI. */
export function pastedBlobHasDetectedFields(result: SplitPastedEmailBlobResult): boolean {
  return result.detected.subject || result.detected.sender || result.detected.receivedAt;
}
