import type { ParsedCommissionStatement } from "@/lib/validations/transaction-import";

export const GENERIC_PROFILE_ID = "generic";
export const KW_PROFILE_ID = "kw";
export const DEFAULT_PROFILE_VERSION = "v1";

type CanonicalExtracted = ParsedCommissionStatement["extracted"];

type ApplyProfileInput = {
  text: string;
  detectedBrokerage: string | null;
  extracted: CanonicalExtracted;
};

export type AppliedParserProfile = {
  parserProfile: string;
  parserProfileVersion: string;
  extracted: CanonicalExtracted;
};

function parseMoney(text: string): number | undefined {
  const cleaned = text.replace(/[,$()\s]/g, "").replace(/^\-/, "");
  const n = Number.parseFloat(cleaned);
  if (!Number.isFinite(n)) return undefined;
  return Math.abs(n);
}

function captureAmount(text: string, patterns: RegExp[]): number | undefined {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    const value = parseMoney(match?.[1] ?? "");
    if (value !== undefined) return value;
  }
  return undefined;
}

export function detectBrokerageFromText(text: string): string | null {
  if (/\bkeller\s*williams\b|\bkw\s+realty\b|\bkwri\b/i.test(text)) return "KW";
  if (/\bbennion\b|\bbdh\b/i.test(text)) return "BDH";
  return null;
}

function applyGenericProfile(input: ApplyProfileInput): AppliedParserProfile {
  return {
    parserProfile: GENERIC_PROFILE_ID,
    parserProfileVersion: DEFAULT_PROFILE_VERSION,
    extracted: input.extracted,
  };
}

function applyKwProfile(input: ApplyProfileInput): AppliedParserProfile {
  const companyDollar = captureAmount(input.text, [
    /company\s*dollar\s*[:\-]?\s*\$?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
  ]);
  const royalty = captureAmount(input.text, [
    /royalty\s*[:\-]?\s*\$?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
  ]);
  const franchise = captureAmount(input.text, [
    /franchise\s*fee\s*[:\-]?\s*\$?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
  ]);
  const kwFees =
    [companyDollar, royalty, franchise]
      .filter((v): v is number => typeof v === "number")
      .reduce((sum, value) => sum + value, 0) || undefined;

  return {
    parserProfile: KW_PROFILE_ID,
    parserProfileVersion: DEFAULT_PROFILE_VERSION,
    extracted: {
      ...input.extracted,
      brokerageName: input.extracted.brokerageName ?? "Keller Williams",
      brokerageFeesTotal: input.extracted.brokerageFeesTotal ?? kwFees,
    },
  };
}

export function applyCommissionParserProfile(
  input: ApplyProfileInput
): AppliedParserProfile {
  if (input.detectedBrokerage === "KW") return applyKwProfile(input);
  return applyGenericProfile(input);
}
