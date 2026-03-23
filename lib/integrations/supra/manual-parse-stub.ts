/**
 * Stub parser for Supra queue items — placeholder until real email parsing exists.
 *
 * Replace this module with a proper parser that reads rawBodyText (+ future headers)
 * and returns structured fields. Call sites: POST …/supra-queue/[id]/parse-draft
 */

import {
  SupraParseConfidence,
  SupraProposedAction,
} from "@prisma/client";

export type SupraManualParseDraft = {
  parsedAddress1: string | null;
  parsedCity: string | null;
  parsedState: string | null;
  parsedZip: string | null;
  parsedScheduledAt: Date | null;
  parsedEventKind: string | null;
  parsedStatus: string | null;
  parsedAgentName: string | null;
  parsedAgentEmail: string | null;
  parseConfidence: SupraParseConfidence;
  proposedAction: SupraProposedAction;
};

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const ZIP_RE = /\b(\d{5})(-\d{4})?\b/;
const STATE_BEFORE_ZIP_RE = /\b([A-Z]{2})\s+\d{5}\b/i;

function firstMeaningfulLine(text: string): string | null {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (line.length < 4) continue;
    if (/^On .+ wrote:/i.test(line)) break;
    if (/^[-_=]{3,}$/.test(line)) continue;
    return line;
  }
  return null;
}

function extractEmail(text: string): string | null {
  const m = text.match(EMAIL_RE);
  return m && m.length ? m[0] : null;
}

function extractZipCityState(text: string): { zip: string | null; state: string | null } {
  const zipM = text.match(ZIP_RE);
  const zip = zipM ? zipM[1] + (zipM[2] ?? "") : null;
  const stM = text.match(STATE_BEFORE_ZIP_RE);
  const state = stM ? stM[1].toUpperCase() : null;
  return { zip, state };
}

/**
 * Heuristic draft from pasted subject + body. Safe to run on any text; may return mostly nulls.
 */
export function buildManualParseDraftFromRaw(input: {
  subject: string;
  rawBodyText: string;
  sender: string | null;
}): SupraManualParseDraft {
  const combined = `${input.subject}\n${input.rawBodyText}`.toLowerCase();
  const body = input.rawBodyText;

  let proposedAction: SupraProposedAction = SupraProposedAction.NEEDS_MANUAL_REVIEW;
  let parsedStatus: string | null = null;
  let parsedEventKind: string | null = "private_showing";

  if (/\bcancel(l(ed|ation)?)?\b/.test(combined) || /\bwithdrawn\b/.test(combined)) {
    proposedAction = SupraProposedAction.DISMISS;
    parsedStatus = "cancelled_guess";
    parsedEventKind = "cancellation";
  } else if (/\breschedul(e|ed|ing)?\b/.test(combined) || /\bnew time\b/.test(combined)) {
    proposedAction = SupraProposedAction.UPDATE_SHOWING;
    parsedStatus = "reschedule_guess";
    parsedEventKind = "reschedule";
  } else if (/\bshowing\b/.test(combined) || /\bappointment\b/.test(combined)) {
    proposedAction = SupraProposedAction.CREATE_SHOWING;
  }

  const email = extractEmail(body) || extractEmail(input.subject);
  const line = firstMeaningfulLine(body);
  const { zip, state } = extractZipCityState(body);

  let parsedAddress1: string | null = line;
  if (parsedAddress1 && parsedAddress1.length > 200) {
    parsedAddress1 = parsedAddress1.slice(0, 200);
  }

  const cityLine = body.split(/\r?\n/).find((l) => STATE_BEFORE_ZIP_RE.test(l));
  let parsedCity: string | null = null;
  if (cityLine) {
    const m = cityLine.match(/^([^,]+),\s*([A-Z]{2})\s+\d{5}/i);
    if (m) parsedCity = m[1].trim();
  }

  return {
    parsedAddress1,
    parsedCity,
    parsedState: state,
    parsedZip: zip,
    parsedScheduledAt: null,
    parsedEventKind,
    parsedStatus,
    parsedAgentName: null,
    parsedAgentEmail: email,
    parseConfidence: SupraParseConfidence.LOW,
    proposedAction,
  };
}
