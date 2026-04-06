import type { Prisma } from "@prisma/client";

/**
 * Prisma fragments aligned with `lib/farm/contact-data-completeness` / FarmTrackr health
 * (null or empty string; whitespace-only DB values may differ from trim-based health).
 */

function hasAnyEmailWhere(): Prisma.ContactWhereInput {
  return {
    OR: [
      { AND: [{ email: { not: null } }, { NOT: { email: "" } }] },
      { AND: [{ email2: { not: null } }, { NOT: { email2: "" } }] },
      { AND: [{ email3: { not: null } }, { NOT: { email3: "" } }] },
      { AND: [{ email4: { not: null } }, { NOT: { email4: "" } }] },
    ],
  };
}

function hasAnyPhoneWhere(): Prisma.ContactWhereInput {
  return {
    OR: [
      { AND: [{ phone: { not: null } }, { NOT: { phone: "" } }] },
      { AND: [{ phone2: { not: null } }, { NOT: { phone2: "" } }] },
    ],
  };
}

function hasUsableMailingWhere(): Prisma.ContactWhereInput {
  return {
    AND: [
      { AND: [{ mailingStreet1: { not: null } }, { NOT: { mailingStreet1: "" } }] },
      { AND: [{ mailingCity: { not: null } }, { NOT: { mailingCity: "" } }] },
      { AND: [{ mailingState: { not: null } }, { NOT: { mailingState: "" } }] },
      { AND: [{ mailingZip: { not: null } }, { NOT: { mailingZip: "" } }] },
    ],
  };
}

function hasUsableSiteWhere(): Prisma.ContactWhereInput {
  return {
    AND: [
      { AND: [{ siteStreet1: { not: null } }, { NOT: { siteStreet1: "" } }] },
      { AND: [{ siteCity: { not: null } }, { NOT: { siteCity: "" } }] },
      { AND: [{ siteState: { not: null } }, { NOT: { siteState: "" } }] },
      { AND: [{ siteZip: { not: null } }, { NOT: { siteZip: "" } }] },
    ],
  };
}

export function contactMissingEmailWhere(): Prisma.ContactWhereInput {
  return { NOT: hasAnyEmailWhere() };
}

export function contactMissingPhoneWhere(): Prisma.ContactWhereInput {
  return { NOT: hasAnyPhoneWhere() };
}

export function contactMissingMailingWhere(): Prisma.ContactWhereInput {
  return { NOT: hasUsableMailingWhere() };
}

export function contactMissingSiteWhere(): Prisma.ContactWhereInput {
  return { NOT: hasUsableSiteWhere() };
}

/** FARM status with at least one non-empty email or phone field (matches health “ready to promote”). */
export function contactFarmReadyToPromoteWhere(): Prisma.ContactWhereInput {
  return {
    status: "FARM",
    OR: [hasAnyEmailWhere(), hasAnyPhoneWhere()],
  };
}

export type ContactHealthMissingParam = "email" | "phone" | "mailing" | "site";

export function contactHealthWhereFromQuery(
  missing: ContactHealthMissingParam | null,
  readyToPromote: boolean
): Prisma.ContactWhereInput | null {
  if (readyToPromote) {
    return contactFarmReadyToPromoteWhere();
  }
  if (missing === "email") return contactMissingEmailWhere();
  if (missing === "phone") return contactMissingPhoneWhere();
  if (missing === "mailing") return contactMissingMailingWhere();
  if (missing === "site") return contactMissingSiteWhere();
  return null;
}
