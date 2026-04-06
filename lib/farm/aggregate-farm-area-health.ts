import type { ContactStatus } from "@prisma/client";
import {
  contactHasAnyEmail,
  contactHasAnyPhone,
  contactHasUsableMailingAddress,
  contactHasUsableSiteAddress,
  contactIsFarmStageReadyToPromote,
  type ContactDataCompletenessFields,
} from "@/lib/farm/contact-data-completeness";

export type FarmAreaHealthMetrics = {
  farmAreaId: string;
  totalContacts: number;
  withEmail: number;
  withPhone: number;
  withMailingAddress: number;
  withSiteAddress: number;
  missingEmail: number;
  missingPhone: number;
  missingMailingAddress: number;
  missingSiteAddress: number;
  farmStageReadyToPromote: number;
  pctWithEmail: number;
  pctWithPhone: number;
  pctWithMailingAddress: number;
  pctWithSiteAddress: number;
};

function pct(n: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((n / total) * 100);
}

export type MembershipHealthRow = {
  farmAreaId: string;
  contact: ContactDataCompletenessFields;
};

/**
 * Aggregates per farm area from active membership rows (caller filters access).
 * Each row is one membership; same contact in two areas appears twice.
 */
export function aggregateFarmAreaHealth(
  memberships: MembershipHealthRow[]
): Map<string, FarmAreaHealthMetrics> {
  const byArea = new Map<
    string,
    {
      total: number;
      email: number;
      phone: number;
      mail: number;
      site: number;
      promote: number;
    }
  >();

  for (const m of memberships) {
    const c = m.contact;
    const cur = byArea.get(m.farmAreaId) ?? {
      total: 0,
      email: 0,
      phone: 0,
      mail: 0,
      site: 0,
      promote: 0,
    };
    cur.total += 1;
    if (contactHasAnyEmail(c)) cur.email += 1;
    if (contactHasAnyPhone(c)) cur.phone += 1;
    if (contactHasUsableMailingAddress(c)) cur.mail += 1;
    if (contactHasUsableSiteAddress(c)) cur.site += 1;
    if (contactIsFarmStageReadyToPromote(c)) cur.promote += 1;
    byArea.set(m.farmAreaId, cur);
  }

  const out = new Map<string, FarmAreaHealthMetrics>();
  byArea.forEach((a, farmAreaId) => {
    out.set(farmAreaId, {
      farmAreaId,
      totalContacts: a.total,
      withEmail: a.email,
      withPhone: a.phone,
      withMailingAddress: a.mail,
      withSiteAddress: a.site,
      missingEmail: a.total - a.email,
      missingPhone: a.total - a.phone,
      missingMailingAddress: a.total - a.mail,
      missingSiteAddress: a.total - a.site,
      farmStageReadyToPromote: a.promote,
      pctWithEmail: pct(a.email, a.total),
      pctWithPhone: pct(a.phone, a.total),
      pctWithMailingAddress: pct(a.mail, a.total),
      pctWithSiteAddress: pct(a.site, a.total),
    });
  });
  return out;
}

/** For tests and API: zero-filled row when an area has no visible contacts. */
export function emptyFarmAreaHealthMetrics(farmAreaId: string): FarmAreaHealthMetrics {
  return {
    farmAreaId,
    totalContacts: 0,
    withEmail: 0,
    withPhone: 0,
    withMailingAddress: 0,
    withSiteAddress: 0,
    missingEmail: 0,
    missingPhone: 0,
    missingMailingAddress: 0,
    missingSiteAddress: 0,
    farmStageReadyToPromote: 0,
    pctWithEmail: 0,
    pctWithPhone: 0,
    pctWithMailingAddress: 0,
    pctWithSiteAddress: 0,
  };
}

export type ContactHealthSelect = {
  firstName: string;
  lastName: string;
  mailingStreet2: string | null;
  email: string | null;
  email2: string | null;
  email3: string | null;
  email4: string | null;
  phone: string | null;
  phone2: string | null;
  mailingStreet1: string | null;
  mailingCity: string | null;
  mailingState: string | null;
  mailingZip: string | null;
  siteStreet1: string | null;
  siteCity: string | null;
  siteState: string | null;
  siteZip: string | null;
  status: ContactStatus | null;
};
