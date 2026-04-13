import type { User } from "@prisma/client";

export type DailyBriefingRolloutMode = "off" | "allowlist" | "internal_domain" | "all_enabled";

function parseMode(): DailyBriefingRolloutMode {
  const raw = process.env.DAILY_BRIEFING_ROLLOUT_MODE?.trim().toLowerCase();
  if (raw === "allowlist" || raw === "internal_domain" || raw === "all_enabled" || raw === "off") {
    return raw;
  }
  return "off";
}

function parseAllowlistIds(): Set<string> {
  const raw = process.env.DAILY_BRIEFING_ALLOWLIST_USER_IDS?.trim();
  if (!raw) {
    return new Set();
  }
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

function parseInternalDomains(): string[] {
  const raw = process.env.DAILY_BRIEFING_INTERNAL_EMAIL_DOMAINS?.trim();
  if (!raw) {
    return [];
  }
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .map((d) => (d.startsWith("@") ? d.slice(1) : d));
}

function emailDomain(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at < 0) {
    return null;
  }
  return email.slice(at + 1).toLowerCase().trim() || null;
}

/**
 * Whether cron sends are globally allowed (ops kill switch).
 */
export function isDailyBriefingCronSendsEnabled(): boolean {
  return process.env.DAILY_BRIEFING_CRON_SENDS_ENABLED?.trim() === "true";
}

/**
 * Eligibility for scheduled delivery beyond per-user `emailEnabled`.
 */
export function isUserEligibleForDailyBriefingRollout(user: User, deliveryEmail: string): boolean {
  const mode = parseMode();
  if (mode === "off") {
    return false;
  }
  if (mode === "all_enabled") {
    return true;
  }
  if (mode === "allowlist") {
    const ids = parseAllowlistIds();
    return ids.has(user.id);
  }
  if (mode === "internal_domain") {
    const domains = parseInternalDomains();
    if (domains.length === 0) {
      return false;
    }
    const dom = emailDomain(deliveryEmail);
    return dom != null && domains.includes(dom);
  }
  return false;
}
