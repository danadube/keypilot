/**
 * Supra email parser v1 — conservative extraction for pasted MLS/Supra-style notifications.
 *
 * Regression fixtures from real PDF exports live in `supra-email-fixtures.ts` (see
 * `__tests__/supra-email-parser.fixtures.test.ts`). Add sanitized samples there when you
 * validate new weekend emails; extend patterns only when a sample clearly matches.
 *
 * Unknown or ambiguous → leave fields null, LOW confidence.
 */

import {
  SupraParseConfidence,
  SupraProposedAction,
} from "@prisma/client";

export type SupraEventIntent =
  | "new_showing"
  | "rescheduled"
  | "cancelled"
  | "showing_ended"
  | "unknown";

/** How we resolved the street/city block — used to cap confidence */
export type SupraAddressParseKind =
  | "labeled"
  | "supra_inline"
  | "line_pair"
  | "none";

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

/** Supra-branded subject/body (PDF exports) */
const SUPRA_NEW_NOTIFICATION_RE =
  /\bsupra\s+showings?\s*[-–]\s*new\s+showing\b|\bnew\s+showing\s+notification\b/i;

const END_OF_SHOWING_SUBJECT_RE = /\bend\s+of\s+showing\b/i;

/** Body: Supra end-of-showing copy */
const SUPRA_ENDED_BODY_RE =
  /\bhas\s+ended\b/i;

/** City, ST ZIP on one line */
const CITY_ST_ZIP_LINE =
  /^(.+?),\s*([A-Za-z]{2})\s+(\d{5})(?:-(\d{4}))?\s*$/;

/** City, ST only (no ZIP) — common in short Supra snippets */
const CITY_ST_LINE = /^(.+?),\s*([A-Za-z]{2})\s*$/;

/** Labeled property / address line */
const LABELED_ADDRESS =
  /^(?:property|property address|listing address|subject property|address|location)\s*[:#]\s*(.+)$/i;

/** US street suffix — line should include a number + (suffix or enough tokens) */
const STREET_SUFFIX_RE =
  /\b(st|street|dr|drive|ave|avenue|rd|road|blvd|boulevard|ln|lane|ct|court|way|cir|circle|pl|place|pkwy|parkway|ter|terrace|trl|trail|run|path|hwy|highway)\b/i;

/** Lines we must never treat as street address (Supra noise, times, KeyBox, etc.) */
const ADDRESS_LINE_NOISE_RE =
  /\b(keybox|began|ended|supraweb|estimated\s+showing|duration\s+is|login\s+to|opt\s+out)\b|@\w+\.|the\s+showing\s+by|supra\s+system\s+detected|\(\s*keybox/i;

const MDY_LEADING_RE = /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/;
const TIME_LIKE_LEADING_RE = /^\d{1,2}:\d{2}\s*(am|pm)\b/i;

/**
 * True if the line plausibly looks like US street line 1 (conservative).
 * Exported for unit tests / regression fixtures.
 */
export function isPlausibleStreetAddressLine(line: string): boolean {
  const t = line.trim().replace(/\s+/g, " ");
  if (t.length < 4 || t.length > 120) return false;
  if (ADDRESS_LINE_NOISE_RE.test(t)) return false;
  if (MDY_LEADING_RE.test(t) || TIME_LIKE_LEADING_RE.test(t)) return false;
  if (EMAIL_RE_ONE.test(t)) return false;

  const hasLeadNumber = /^\d+/.test(t);
  const poBox = /\bpo\s*box\b/i.test(t);
  if (!hasLeadNumber && !poBox) return false;

  if (STREET_SUFFIX_RE.test(t)) return true;

  const tokenCount = t.split(/\s+/).length;
  return tokenCount >= 3;
}

function isPlausibleCityField(s: string): boolean {
  const t = s.trim().replace(/\s+/g, " ");
  if (t.length < 2 || t.length > 60) return false;
  if (ADDRESS_LINE_NOISE_RE.test(t)) return false;
  if (EMAIL_RE_ONE.test(t) || /@/.test(t)) return false;
  if (/^\d+$/.test(t)) return false;
  if (MDY_LEADING_RE.test(t) || TIME_LIKE_LEADING_RE.test(t)) return false;
  if (/\b(keybox|began|ended)\b/i.test(t)) return false;
  return true;
}

/**
 * Supra often breaks as: "... at 500 Oak Drive" / "Austin, TX 78701" (no comma before city).
 * Merge into one line so `at …, City, ST ZIP` regex still sees the full sentence (keeps "the showing by" for anchor).
 */
function tryMergeSupraTailWithCityLine(cur: string, next: string): string | null {
  const n = next.trim();
  if (!CITY_ST_ZIP_LINE.test(n)) return null;
  const lower = cur.toLowerCase();
  const atIdx = lower.lastIndexOf(" at ");
  if (atIdx < 0) return null;
  const tail = cur.slice(atIdx + 4).trim();
  if (tail.includes(",") || /\bkeybox\b/i.test(tail)) return null;
  if (!isPlausibleStreetAddressLine(tail)) return null;
  return `${cur.trim()}, ${n}`;
}

/**
 * Join orphan street-only line + "City, ST ZIP", or Supra "... at Street" + city line.
 */
function joinOrphanStreetWithCityZipLine(lines: string[]): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const cur = lines[i];
    const next = lines[i + 1];
    if (next) {
      const mergedTail = tryMergeSupraTailWithCityLine(cur, next);
      if (mergedTail) {
        out.push(mergedTail);
        i += 2;
        continue;
      }
    }
    if (
      next &&
      CITY_ST_ZIP_LINE.test(next.trim()) &&
      !cur.includes(",") &&
      isPlausibleStreetAddressLine(cur) &&
      !/\bkeybox\b/i.test(cur)
    ) {
      out.push(`${cur}, ${next.trim()}`);
      i += 2;
      continue;
    }
    out.push(cur);
    i += 1;
  }
  return out;
}

/**
 * Scan all `at …, City, ST ZIP` segments; validate captures; prefer match after "the showing by".
 */
function findBestSupraInlineAddress(norm: string): {
  address1: string;
  city: string;
  state: string;
  zip: string;
} | null {
  const re =
    /\bat\s+(.+?),\s*([^,\n]{1,80}),\s*([A-Za-z]{2})\s+(\d{5})(?:-(\d{4}))?\b/gi;
  type Hit = {
    index: number;
    address1: string;
    city: string;
    state: string;
    zip: string;
  };
  const hits: Hit[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(norm)) !== null) {
    const address1 = m[1].trim().replace(/\s+/g, " ");
    const city = m[2].trim().replace(/\s+/g, " ");
    const state = m[3].toUpperCase();
    const zip = m[4] + (m[5] ? `-${m[5]}` : "");
    if (!isPlausibleStreetAddressLine(address1)) continue;
    if (!isPlausibleCityField(city)) continue;
    hits.push({ index: m.index, address1, city, state, zip });
  }
  if (hits.length === 0) return null;
  const lower = norm.toLowerCase();
  const anchor = lower.indexOf("the showing by");
  const pick =
    anchor >= 0 ? hits.find((h) => h.index >= anchor) ?? hits[0] : hits[0];
  return {
    address1: pick.address1,
    city: pick.city,
    state: pick.state,
    zip: pick.zip,
  };
}

function stripHtmlNoise(s: string): string {
  return s
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

/** "at 123 Main St, City, ST 12345" — common in Supra notifications (often one line) */
function normalizeCommasAcrossBreaks(s: string): string {
  return stripHtmlNoise(s).replace(/,\s*\n\s*/g, ", ");
}

/**
 * `looseShowingHint`: true when intent is only from generic "showing"/"appointment" words
 * (easy to misfire) — caps confidence and should not yield HIGH alone.
 */
export function detectIntent(subject: string, body: string): {
  intent: SupraEventIntent;
  looseShowingHint: boolean;
} {
  const combined = `${subject}\n${body}`;
  const t = combined.toLowerCase();
  if (CANCEL_RE.test(t)) return { intent: "cancelled", looseShowingHint: false };
  if (RESCHEDULE_RE.test(t)) return { intent: "rescheduled", looseShowingHint: false };
  if (END_OF_SHOWING_SUBJECT_RE.test(combined)) {
    return { intent: "showing_ended", looseShowingHint: false };
  }
  if (SUPRA_ENDED_BODY_RE.test(body) && /\bbegan\b/i.test(body)) {
    return { intent: "showing_ended", looseShowingHint: false };
  }
  if (NEW_SHOWING_RE.test(t)) return { intent: "new_showing", looseShowingHint: false };
  if (SUPRA_NEW_NOTIFICATION_RE.test(combined)) {
    return { intent: "new_showing", looseShowingHint: false };
  }
  if (/\bthe\s+showing\s+by\b/i.test(combined) && /\bbegan\b/i.test(combined)) {
    return { intent: "new_showing", looseShowingHint: false };
  }
  if (/\bshowing\b/.test(t) || /\bappointment\b/.test(t)) {
    return { intent: "new_showing", looseShowingHint: true };
  }
  return { intent: "unknown", looseShowingHint: false };
}

function intentToProposedAction(intent: SupraEventIntent): SupraProposedAction {
  switch (intent) {
    case "cancelled":
      return SupraProposedAction.DISMISS;
    case "showing_ended":
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
  kind: SupraAddressParseKind;
} {
  const rawLines = stripHtmlNoise(text).split(/\r?\n/);
  const trimmed = rawLines.map((l) => l.trim()).filter(Boolean);
  const lines = joinOrphanStreetWithCityZipLine(trimmed);
  const norm = normalizeCommasAcrossBreaks(lines.join("\n"));

  const inline = findBestSupraInlineAddress(norm);
  if (inline) {
    return {
      address1: inline.address1.slice(0, 500),
      city: inline.city,
      state: inline.state,
      zip: inline.zip,
      kind: "supra_inline",
    };
  }

  for (let i = 0; i < lines.length; i++) {
    const labeled = lines[i].match(LABELED_ADDRESS);
    if (labeled) {
      const rest = labeled[1].trim();
      const oneline = rest.match(
        /^(.+?),\s*([^,]+),\s*([A-Za-z]{2})\s+(\d{5})(?:-(\d{4}))?$/i
      );
      if (oneline) {
        const a1 = oneline[1].trim();
        if (!isPlausibleStreetAddressLine(a1)) continue;
        const c = oneline[2].trim();
        if (!isPlausibleCityField(c)) continue;
        return {
          address1: a1.slice(0, 500),
          city: c,
          state: oneline[3].toUpperCase(),
          zip: oneline[4] + (oneline[5] ? `-${oneline[5]}` : ""),
          kind: "labeled",
        };
      }
      const next = lines[i + 1];
      if (next) {
        const csz = next.match(CITY_ST_ZIP_LINE);
        if (csz && isPlausibleStreetAddressLine(rest)) {
          return {
            address1: rest.slice(0, 500),
            city: csz[1].trim(),
            state: csz[2].toUpperCase(),
            zip: csz[3] + (csz[4] ? `-${csz[4]}` : ""),
            kind: "labeled",
          };
        }
      }
      if (isPlausibleStreetAddressLine(rest)) {
        return {
          address1: rest.slice(0, 500),
          city: null,
          state: null,
          zip: null,
          kind: "labeled",
        };
      }
    }
  }

  for (let i = 1; i < lines.length; i++) {
    const prev = lines[i - 1];
    const csz = lines[i].match(CITY_ST_ZIP_LINE);
    if (csz) {
      if (
        isPlausibleStreetAddressLine(prev) &&
        !MDY_LEADING_RE.test(prev) &&
        !TIME_LIKE_LEADING_RE.test(prev) &&
        !ADDRESS_LINE_NOISE_RE.test(prev)
      ) {
        return {
          address1: prev.slice(0, 500),
          city: csz[1].trim(),
          state: csz[2].toUpperCase(),
          zip: csz[3] + (csz[4] ? `-${csz[4]}` : ""),
          kind: "line_pair",
        };
      }
      continue;
    }
    const csOnly = lines[i].match(CITY_ST_LINE);
    if (
      csOnly &&
      !/\d{5}/.test(lines[i]) &&
      isPlausibleStreetAddressLine(prev) &&
      !MDY_LEADING_RE.test(prev) &&
      !TIME_LIKE_LEADING_RE.test(prev) &&
      !ADDRESS_LINE_NOISE_RE.test(prev)
    ) {
      const c = csOnly[1].trim();
      if (!isPlausibleCityField(c)) continue;
      return {
        address1: prev.slice(0, 500),
        city: c,
        state: csOnly[2].toUpperCase(),
        zip: null,
        kind: "line_pair",
      };
    }
  }

  return {
    address1: null,
    city: null,
    state: null,
    zip: null,
    kind: "none",
  };
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

/** Prefer "has ended MM/DD/YYYY h:mmAM" for Supra end notifications */
function extractEndedDateTime(body: string): Date | null {
  const m = body.match(
    /\bhas\s+ended\s+(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\s+(\d{1,2}:\d{2}\s*(?:AM|PM))/i
  );
  if (!m) return null;
  const mo = parseInt(m[1], 10);
  const day = parseInt(m[2], 10);
  let yr = parseInt(m[3], 10);
  if (yr < 100) yr += 2000;
  const tm = parseTimeToHoursMinutes(
    m[4].trim().toUpperCase().replace(/\s+/g, " ")
  );
  if (!tm || mo < 1 || mo > 12 || day < 1 || day > 31) return null;
  const d = new Date(yr, mo - 1, day, tm.h, tm.m, 0, 0);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function extractSupraShowingByAgent(text: string): {
  name: string | null;
  email: string | null;
} | null {
  const m = text.match(/the\s+showing\s+by\s+([^\n(]+?)\s*\(\s*([^)]+)\)/i);
  if (!m) return null;
  const name = m[1].replace(/\s+/g, " ").trim();
  const inner = m[2].trim();
  const em = inner.match(EMAIL_RE_ONE);
  return {
    name: name.length >= 2 ? name.slice(0, 300) : null,
    email: em ? em[0].toLowerCase() : null,
  };
}

function extractAgent(text: string): { name: string | null; email: string | null } {
  const supraBy = extractSupraShowingByAgent(text);
  if (supraBy && (supraBy.name || supraBy.email)) {
    return supraBy;
  }

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
  addressKind: SupraAddressParseKind;
  looseShowingHint: boolean;
}): SupraParseConfidence {
  const fullAddr = Boolean(
    args.address1 && args.city && args.state && args.zip
  );
  const partialAddr = Boolean(
    args.address1 || (args.city && args.state) || args.zip
  );

  if (args.intent === "showing_ended") {
    if (fullAddr) return SupraParseConfidence.MEDIUM;
    return SupraParseConfidence.LOW;
  }

  if (args.intent === "cancelled") {
    if (fullAddr) return SupraParseConfidence.MEDIUM;
    return SupraParseConfidence.LOW;
  }

  if (args.looseShowingHint) {
    if (fullAddr && args.scheduledAt) return SupraParseConfidence.MEDIUM;
    return SupraParseConfidence.LOW;
  }

  const structured =
    args.addressKind === "labeled" || args.addressKind === "supra_inline";

  if (
    structured &&
    fullAddr &&
    args.scheduledAt &&
    (args.intent === "new_showing" || args.intent === "rescheduled")
  ) {
    return SupraParseConfidence.HIGH;
  }

  if (
    (fullAddr && args.scheduledAt) ||
    (structured && fullAddr && args.intent === "new_showing") ||
    (args.scheduledAt &&
      args.intent !== "unknown" &&
      partialAddr)
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
  const { intent, looseShowingHint } = detectIntent(subject, body);
  const proposedAction = intentToProposedAction(intent);

  const { address1, city, state, zip, kind: addressKind } = extractAddress(body);
  let scheduledAt = extractDateTime(subject, body);
  if (intent === "showing_ended") {
    const endedAt = extractEndedDateTime(body);
    if (endedAt) scheduledAt = endedAt;
  }
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
    case "showing_ended":
      parsedEventKind = "showing_ended";
      parsedStatus = "showing_ended";
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
    addressKind,
    looseShowingHint,
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
