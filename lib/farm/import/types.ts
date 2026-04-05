export type FarmImportColumnMapping = {
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  territory?: string | null;
  area?: string | null;
  mailingStreet1?: string | null;
  mailingStreet2?: string | null;
  mailingCity?: string | null;
  mailingState?: string | null;
  mailingZip?: string | null;
  siteStreet1?: string | null;
  siteStreet2?: string | null;
  siteCity?: string | null;
  siteState?: string | null;
  siteZip?: string | null;
  email2?: string | null;
  email3?: string | null;
  email4?: string | null;
  phone2?: string | null;
};

export type FarmImportRawRow = Record<string, string>;

export type FarmImportRowStatus =
  | "matched"
  | "create_contact"
  | "reactivate_membership"
  | "create_membership"
  | "already_member"
  | "skipped";

export type FarmImportPreviewRow = {
  rowNumber: number;
  status: FarmImportRowStatus;
  reason?: string;
  email: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  territoryName: string | null;
  areaName: string | null;
  matchedContactId: string | null;
  matchedBy: "email" | "phone" | "name" | null;
  willCreateTerritory: boolean;
  willReactivateTerritory: boolean;
  willCreateArea: boolean;
  willReactivateArea: boolean;
};

export type FarmImportSummary = {
  totalRows: number;
  matchedContacts: number;
  createdContacts: number;
  reactivatedContacts: number;
  createdMemberships: number;
  reactivatedMemberships: number;
  skippedRows: number;
  createdTerritories: number;
  reactivatedTerritories: number;
  createdAreas: number;
  reactivatedAreas: number;
};
