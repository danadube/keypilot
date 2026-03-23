/**
 * Supra email parser v1 — conservative extraction for pasted MLS/Supra-style notifications.
 *
 * Source of truth: common US showing-email patterns (labeled property lines, City ST ZIP,
 * ISO and US date/time phrases). Unknown or ambiguous → leave fields null, LOW confidence.
 *
 * Replace/extend patterns as you capture more real weekend emails.
 */

import {
  SupraParseConfidence,
  SupraProposedAction,
} from "@prisma/client";

export type SupraEventIntent = "new_showing" | "rescheduled" | "cancelled" | "unknown";

export type SupraParseDraft = {
  parsedAddress1: string | null;
  parsedCity: string | null;
  parsedState: string | null;
  parsedZip: string | null;
  parsedScheduledAt: Date | null;
  parsedEventKind: string | null;
  parsedStatus: string | null;
  parsedAgentName: string | null;
  parsedAgentEmail: string | null;
  /** Hint for debugging; not persisted on SupraQueueItem */
  parsedSourceHint: string | null;
  parseConfidence: SupraParseConfidence;
  proposedAction: SupraProposedAction;
};

const EMAIL_RE_GLOBAL = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g;
const EMAIL_RE_ONE = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/i;

const CANCEL_RE =
  /\b(?:showing\s+(?:has\s+been\s+)?(?:cancel(?:led|ed)?|canceled)|cancellation|withdrawn|showing\s+is\s+cancel|no\s+longer\s+(?:scheduled|available))\b/i;

const RESCHEDULE_RE =
  /\b(?:reschedul(?:e|ed|ing)?|changed\s+(?:the\s+)?(?:appointment|showing)?\s*time|new\s+(?:appointment|showing)\s*time|updated\s+time|time\s+has\s+been\s+changed)\b/i;

const NEW_SHOWING_RE =
  /\b(?:showing\s+(?:is\s+)?(?:scheduled|confirmed|booked|set)|showing\s+request|appointment\s+(?:is\s+)?(?:scheduled|confirmed)|private\s+showing\s+(?:scheduled|confirmed|request))\b/i;

/** City, ST ZIP on one line */
const CITY_ST_ZIP_LINE =
  /^(.+?),\s*([A-Za-z]{2})\s+(\d{5})(?:-(\d{4}))?\s*$/;

/** City, ST only (no ZIP) — common in short Supra snippets */
const CITY_ST_LINE = /^(.+?),\s*([A-Za-z]{2})\s*$/;

/** Labeled property / address line */
const LABELED_ADDRESS =
  /^(?:property|property address|listing address|subject property|address|location)\s*[:#]\s*(.+)$/i;

function stripHtmlNoise(s: string): string {
  return s
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

function detectIntent(subject: string, body: string): SupraEventIntent {
  const t = `${subject}\n${body}`.toLowerCase();
  if (CANCEL_RE.test(t)) return "cancelled";
  if (RESCHEDULE_RE.test(t)) return "rescheduled";
  if (NEW_SHOWING_RE.test(t)) return "new_showing";
  if (/\bshowing\b/.test(t) || /\bappointment\b/.test(t)) return "new_showing";
  return "unknown";
}

function intentToProposedAction(intent: SupraEventIntent): SupraProposedAction {
  switch (intent) {
    case "cancelled":
      return SupraProposedAction.DISMISS;
    case "rescheduled":
      return SupraProposedAction.UPDATE_SHOWING;
    case "new_showing":
      return SupraProposedAction.CREATE_SHOWING;
    default:
      return SupraProposedAction.NEEDS_MANUAL_REVIEW;
  }
}

function extractEmails(text: string): string[] {
  const m = text.match(EMAIL_RE_GLOBAL);
  if (!m?.length) return [];
  const skip = /^(no-?reply|donotreply|mailer-daemon|postmaster)@/i;
  return Array.from(new Set(m.map((e) => e.trim()))).filter((e) => !skip.test(e));
}

function extractAddress(text: string): {
  address1: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
} {
  const rawLines = stripHtmlNoise(text).split(/\r?\n/);
  const lines = rawLines.map((l) => l.trim()).filter(Boolean);

  for (let i = 0; i < lines.length; i++) {
    const labeled = lines[i].match(LABELED_ADDRESS);
    if (labeled) {
      const rest = labeled[1].trim();
      const oneline = rest.match(
        /^(.+?),\s*([^,]+),\s*([A-Za-z]{2})\s+(\d{5})(?:-(\d{4}))?$/i
      );
      if (oneline) {
        return {
          address1: oneline[1].trim().slice(0, 500),
          city: oneline[2].trim(),
          state: oneline[3].toUpperCase(),
          zip: oneline[4] + (oneline[5] ? `-${oneline[5]}` : ""),
        };
      }
      const next = lines[i + 1];
      if (next) {
        const csz = next.match(CITY_ST_ZIP_LINE);
        if (csz && /^\d/.test(rest)) {
          return {
            address1: rest.slice(0, 500),
            city: csz[1].trim(),
            state: csz[2].toUpperCase(),
            zip: csz[3] + (csz[4] ? `-${csz[4]}` : ""),
          };
        }
      }
      if (/^\d/.test(rest) && rest.length >= 4) {
        return { address1: rest.slice(0, 500), city: null, state: null, zip: null };
      }
    }
  }

  for (let i = 1; i < lines.length; i++) {
    const prev = lines[i - 1];
    const csz = lines[i].match(CITY_ST_ZIP_LINE);
    if (csz) {
      if (/^\d[\dA-Za-z]/.test(prev) && !/^\d{1,2}[\/\-]\d/.test(prev)) {
        return {
          address1: prev.slice(0, 500),
          city: csz[1].trim(),
          state: csz[2].toUpperCase(),
          zip: csz[3] + (csz[4] ? `-${csz[4]}` : ""),
        };
      }
      continue;
    }
    const csOnly = lines[i].match(CITY_ST_LINE);
    if (
      csOnly &&
      !/\d{5}/.test(lines[i]) &&
      /^\d[\dA-Za-z]/.test(prev) &&
      !/^\d{1,2}[\/\-]\d/.test(prev)
    ) {
      return {
        address1: prev.slice(0, 500),
        city: csOnly[1].trim(),
        state: csOnly[2].toUpperCase(),
        zip: null,
      };
    }
  }

  return { address1: null, city: null, state: null, zip: null };
}

const MONTH_TOKEN_TO_INDEX: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

function monthTokenToIndex(token: string): number | null {
  const key = token.trim().toLowerCase().slice(0, 3);
  return MONTH_TOKEN_TO_INDEX[key] ?? null;
}

function parseTimeToHoursMinutes(s: string): { h: number; m: number } | null {
  const ampm = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (ampm) {
    let h = parseInt(ampm[1], 10);
    const m = parseInt(ampm[2], 10);
    const ap = ampm[3].toUpperCase();
    if (ap === "PM" && h < 12) h += 12;
    if (ap === "AM" && h === 12) h = 0;
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) return { h, m };
  }
  const twentyfour = s.match(/^(\d{1,2}):(\d{2})$/);
  if (twentyfour) {
    const h = parseInt(twentyfour[1], 10);
    const m = parseInt(twentyfour[2], 10);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) return { h, m };
  }
  return null;
}

/**
 * Try to build a local Date in America-centric interpretation (manual review still required).
 */
function extractDateTime(subject: string, body: string): Date | null {
  const text = `${subject}\n${body}`;

  const iso = text.match(
    /\b(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:\.\d{3})?(?:Z|[+-]\d{2}:?\d{2})?)\b/
  );
  if (iso) {
    const d = new Date(iso[1]);
    if (!Number.isNaN(d.getTime())) return d;
  }

  const monthNames =
    "(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)";
  const mdYTime = new RegExp(
    `\\b(${monthNames})\\s+(\\d{1,2}),?\\s+(\\d{4})\\s+(?:at\\s+)?(\\d{1,2}:\\d{2}\\s*(?:AM|PM))`,
    "i"
  );
  const m1 = text.match(mdYTime);
  if (m1) {
    const tryParse = Date.parse(m1[0]);
    if (!Number.isNaN(tryParse)) return new Date(tryParse);
    const moIdx = monthTokenToIndex(m1[1]);
    const day = parseInt(m1[2], 10);
    const yr = parseInt(m1[3], 10);
    const tm = parseTimeToHoursMinutes(
      m1[4].trim().toUpperCase().replace(/\s+/g, " ")
    );
    if (
      moIdx != null &&
      tm &&
      day >= 1 &&
      day <= 31 &&
      yr >= 1990 &&
      yr <= 2100
    ) {
      const d = new Date(yr, moIdx, day, tm.h, tm.m, 0, 0);
      if (!Number.isNaN(d.getTime())) return d;
    }
  }

  const mdyPatterns = [
    /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\s+(\d{1,2}:\d{2}\s*(?:AM|PM))\b/i,
    /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b[^\n]{0,40}(\d{1,2}:\d{2}\s*(?:AM|PM))/i,
  ];
  for (const re of mdyPatterns) {
    const m = text.match(re);
    if (!m) continue;
    const mo = parseInt(m[1], 10);
    const day = parseInt(m[2], 10);
    let yr = parseInt(m[3], 10);
    if (yr < 100) yr += 2000;
    const tm = parseTimeToHoursMinutes(m[4].trim().toUpperCase().replace(/\s+/g, " "));
    if (!tm) continue;
    if (mo < 1 || mo > 12 || day < 1 || day > 31) continue;
    const d = new Date(yr, mo - 1, day, tm.h, tm.m, 0, 0);
    if (!Number.isNaN(d.getTime())) return d;
  }

  const startLabel = text.match(
    /(?:start|showing\s*time|appointment\s*time|date\s*[&:])\s*[:#]?\s*([^\n]+)/i
  );
  if (startLabel) {
    const slice = startLabel[1].slice(0, 120);
    const nested = extractDateTime("", slice);
    if (nested) return nested;
  }

  return null;
}

function extractAgent(text: string): { name: string | null; email: string | null } {
  const labeledLoose = text.match(
    /(?:buyer(?:'s)?\s*)?(?:agent|realtor)\s*[:#]\s*(.+)$/im
  );
  if (labeledLoose) {
    const part = labeledLoose[1].trim();
    const em = part.match(EMAIL_RE_ONE);
    if (em) {
      const name = part.replace(EMAIL_RE_ONE, "").replace(/[,;]+$/g, "").trim();
      return {
        name: name.length >= 2 ? name.slice(0, 300) : null,
        email: em[0].toLowerCase(),
      };
    }
  }

  const buyer = text.match(
    /(?:buyer|buyer's|buyers)\s*(?:agent|realtor|broker)\s*[:#]\s*([^\n<]+?)(?:\n|$)/i
  );
  const agent = text.match(/(?:^|\n)\s*agent\s*[:#]\s*([^\n<]+?)(?:\n|$)/i);
  const line = (buyer?.[1] || agent?.[1])?.trim() || null;

  const angle = text.match(
    /\b([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z'.-]+){0,3})\s*<([^>\s]+@[^>\s]+)>/m
  );
  if (angle) {
    return { name: angle[1].trim(), email: angle[2].trim().toLowerCase() };
  }

  const emails = extractEmails(text);
  const email = emails[0] ?? null;

  if (line) {
    const emailInLine = line.match(EMAIL_RE_ONE);
    const nameOnly = emailInLine
      ? line.replace(EMAIL_RE_ONE, "").replace(/[<>(),]/g, "").trim()
      : line.replace(/[<>(),]/g, "").trim();
    if (nameOnly.length >= 2)
      return { name: nameOnly.slice(0, 300), email: emailInLine?.[0]?.toLowerCase() ?? email };
  }

  return { name: null, email };
}

function computeConfidence(args: {
  intent: SupraEventIntent;
  address1: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  scheduledAt: Date | null;
  agentEmail: string | null;
}): SupraParseConfidence {
  const fullAddr = Boolean(
    args.address1 && args.city && args.state && args.zip
  );
  const partialAddr = Boolean(
    args.address1 || (args.city && args.state) || args.zip
  );

  if (args.intent === "cancelled") {
    if (fullAddr) return SupraParseConfidence.MEDIUM;
    if (partialAddr) return SupraParseConfidence.LOW;
    return SupraParseConfidence.LOW;
  }

  if (fullAddr && args.scheduledAt && args.intent !== "unknown") {
    return SupraParseConfidence.HIGH;
  }

  if (
    (fullAddr && args.scheduledAt) ||
    (fullAddr && args.intent !== "unknown") ||
    (args.scheduledAt && args.intent !== "unknown" && partialAddr)
  ) {
    return SupraParseConfidence.MEDIUM;
  }

  if (partialAddr || args.scheduledAt || args.agentEmail) {
    return SupraParseConfidence.LOW;
  }

  return SupraParseConfidence.LOW;
}

/**
 * Main entry: parse pasted Supra-style email into queue draft fields.
 */
export function parseSupraEmailToDraft(input: {
  subject: string;
  rawBodyText: string;
  sender: string | null;
}): SupraParseDraft {
  const body = input.rawBodyText ?? "";
  const subject = input.subject ?? "";
  const intent = detectIntent(subject, body);
  const proposedAction = intentToProposedAction(intent);

  const { address1, city, state, zip } = extractAddress(body);
  const scheduledAt = extractDateTime(subject, body);
  const agent = extractAgent(body);

  const parsedSourceHint = input.sender?.trim() || null;

  let parsedEventKind: string | null = null;
  let parsedStatus: string | null = null;
  switch (intent) {
    case "new_showing":
      parsedEventKind = "private_showing";
      parsedStatus = "new_showing";
      break;
    case "rescheduled":
      parsedEventKind = "reschedule";
      parsedStatus = "rescheduled";
      break;
    case "cancelled":
      parsedEventKind = "cancellation";
      parsedStatus = "cancelled";
      break;
    default:
      parsedEventKind = null;
      parsedStatus = null;
  }

  const parseConfidence = computeConfidence({
    intent,
    address1,
    city,
    state,
    zip,
    scheduledAt,
    agentEmail: agent.email,
  });

  return {
    parsedAddress1: address1,
    parsedCity: city,
    parsedState: state,
    parsedZip: zip,
    parsedScheduledAt: scheduledAt,
    parsedEventKind,
    parsedStatus,
    parsedAgentName: agent.name,
    parsedAgentEmail: agent.email,
    parsedSourceHint,
    parseConfidence,
    proposedAction,
  };
}
