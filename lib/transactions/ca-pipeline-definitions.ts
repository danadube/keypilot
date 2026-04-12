/**
 * California-oriented transaction document pipeline (stage + document rows).
 * Abbreviations follow common CAR-style naming; expand labels in UI.
 */

export type PipelineSide = "SELL" | "BUY";

export type PipelineStageKey =
  | "pre_listing"
  | "active_listing"
  | "escrow"
  | "pre_offer"
  | "offer_submission"
  | "escrow_buyer";

export type RequirementKind = "required" | "conditional";

export type DocumentStatus =
  | "not_started"
  | "sent"
  | "signed"
  | "uploaded"
  | "complete";

export type CaPipelineDocDef = {
  code: string;
  label: string;
  stage: PipelineStageKey;
  requirement: RequirementKind;
};

const LISTING: CaPipelineDocDef[] = [
  { code: "RLA", label: "Residential Listing Agreement", stage: "pre_listing", requirement: "required" },
  { code: "SA", label: "Seller Advisory", stage: "pre_listing", requirement: "required" },
  { code: "AD", label: "Agency / disclosure (listing)", stage: "pre_listing", requirement: "required" },
  { code: "WFA", label: "Wire Fraud Advisory", stage: "pre_listing", requirement: "required" },
  { code: "TDS", label: "Transfer Disclosure Statement", stage: "active_listing", requirement: "required" },
  { code: "SPQ", label: "Seller Property Questionnaire", stage: "active_listing", requirement: "required" },
  { code: "NHD", label: "Natural Hazard Disclosure", stage: "active_listing", requirement: "conditional" },
  { code: "FHDS", label: "Federal Lead / Hazards (as applicable)", stage: "active_listing", requirement: "conditional" },
  { code: "AVID", label: "Agent Visual Inspection Disclosure", stage: "active_listing", requirement: "required" },
  { code: "WCMD", label: "Water Conserving Plumbing Fixtures", stage: "active_listing", requirement: "conditional" },
  { code: "ESD", label: "Environmental / hazards booklet (as applicable)", stage: "escrow", requirement: "conditional" },
  { code: "FLD", label: "Final walkthrough / delivery docs", stage: "escrow", requirement: "required" },
];

const BUYER: CaPipelineDocDef[] = [
  { code: "BRE", label: "Buyer Representation Agreement", stage: "pre_offer", requirement: "required" },
  { code: "BIA", label: "Buyer Inspection Advisory", stage: "pre_offer", requirement: "required" },
  { code: "AD", label: "Agency / disclosure (buyer)", stage: "pre_offer", requirement: "required" },
  { code: "WFA", label: "Wire Fraud Advisory", stage: "pre_offer", requirement: "required" },
  { code: "RPA", label: "Residential Purchase Agreement", stage: "offer_submission", requirement: "required" },
  { code: "PA", label: "Purchase addenda (as applicable)", stage: "offer_submission", requirement: "conditional" },
  { code: "FA", label: "Financing / loan contingencies", stage: "offer_submission", requirement: "conditional" },
  { code: "COP", label: "Contingency removal package", stage: "offer_submission", requirement: "conditional" },
  { code: "TDS", label: "TDS review / acknowledgment", stage: "escrow_buyer", requirement: "required" },
  { code: "SPQ", label: "SPQ review", stage: "escrow_buyer", requirement: "conditional" },
  { code: "NHD", label: "NHD review", stage: "escrow_buyer", requirement: "conditional" },
  { code: "RRR", label: "Repair request / response", stage: "escrow_buyer", requirement: "conditional" },
  { code: "VP", label: "Verification of property condition", stage: "escrow_buyer", requirement: "conditional" },
  { code: "CR", label: "Contingency removal / close of escrow docs", stage: "escrow_buyer", requirement: "required" },
];

export function getCaPipelineDocs(side: PipelineSide): CaPipelineDocDef[] {
  return side === "SELL" ? LISTING : BUYER;
}

export const PIPELINE_STAGE_LABELS: Record<PipelineStageKey, string> = {
  pre_listing: "Pre-Listing",
  active_listing: "Active Listing",
  escrow: "Escrow / Under Contract",
  pre_offer: "Pre-Offer",
  offer_submission: "Offer Submission",
  escrow_buyer: "Escrow / Under Contract",
};

/** Display order within a side */
export const PIPELINE_STAGE_ORDER: Record<PipelineSide, PipelineStageKey[]> = {
  SELL: ["pre_listing", "active_listing", "escrow"],
  BUY: ["pre_offer", "offer_submission", "escrow_buyer"],
};
