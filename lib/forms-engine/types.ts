/**
 * Jurisdiction-aware forms engine — core types.
 * Paperwork is derived from rules + catalog, not a single national list.
 */

/** How a requirement is treated in workflow and compliance views */
export type RequirementBucket =
  | "required"
  | "conditional"
  | "optional"
  | "brokerage_required"
  | "compliance_only"
  | "operational_task";

/** Normalized, revision-addressable form identity (catalog row) */
export interface NormalizedFormMetadata {
  formId: string;
  revisionId: string;
  title: string;
  shortCode: string;
  /** US state code, uppercase */
  jurisdictionState: string;
  /** e.g. CAR, TREC, FAR — association or board package */
  providerId?: string;
  /** Stable family for matching across revisions: listing_agreement, rpa, disclosure, ... */
  formFamily: string;
  /** Optional taxonomy e.g. residential, commercial */
  propertyTypeTags?: string[];
  tags?: string[];
  effectiveFrom?: string;
  supersededByRevisionId?: string;
}

export interface FormCatalogEntry {
  metadata: NormalizedFormMetadata;
  externalRefs?: Record<string, string>;
}

export interface FormCatalog {
  version: string;
  generatedAt?: string;
  entries: FormCatalogEntry[];
}

export interface JurisdictionProfile {
  id: string;
  /** US state code uppercase */
  stateCode: string;
  displayName: string;
  /** Template ids suggested for this jurisdiction (MVP: pick by property + side) */
  templateIdsByKey: Record<string, string>;
  /** Rule packs to load / ordering hint */
  rulePackIds: string[];
}

/**
 * Transaction-side paperwork template — references rules by id, not inline doc list.
 * Decoupled from checklist UI “stages”; use stageHint on rules for presentation only.
 */
export interface TransactionTemplate {
  id: string;
  jurisdictionProfileId: string;
  label: string;
  /** Empty = any property type in MVP matcher */
  propertyTypes: string[];
  side: "SELL" | "BUY" | "BOTH";
  documentRequirementRuleIds: string[];
}

/** Boolean expression over transaction context (MVP DSL) */
export type RuleCondition =
  | { type: "always" }
  | { type: "property_type"; value: string }
  | { type: "transaction_flag"; flag: string }
  | { type: "and"; children: RuleCondition[] }
  | { type: "or"; children: RuleCondition[] }
  | { type: "not"; child: RuleCondition };

export interface DocumentRequirementRule {
  id: string;
  label: string;
  formId: string;
  /** Pin catalog revision; generator may override via BrokerageOverlay */
  revisionPin?: string;
  bucket: RequirementBucket;
  when: RuleCondition;
  /** Non-canonical hint for UI ordering / grouping — not a workflow engine stage id */
  stageHint?: string;
  sortOrder: number;
}

export interface BrokerageOverlay {
  id: string;
  brokerageId: string;
  additionalRuleIds: string[];
  formRevisionOverrides?: Record<string, string>;
  /** Rule ids that must be treated as brokerage-mandated (bucket may be upgraded in UI) */
  brokerageMandatoryRuleIds?: string[];
}

export type TransactionDocumentInstanceStatus =
  | "not_applicable"
  | "not_started"
  | "in_progress"
  | "complete"
  | "waived";

/**
 * One row of paperwork derived for a transaction — suitable for persistence and UI.
 * `id` should be generated when materializing (UUID).
 */
export interface TransactionDocumentInstance {
  id: string;
  transactionId: string;
  sourceRuleId: string;
  formId: string;
  revisionId: string;
  bucket: RequirementBucket;
  title: string;
  shortCode: string;
  status: TransactionDocumentInstanceStatus;
  stageHint?: string;
  sortOrder: number;
  providerId?: string;
  formFamily: string;
  metadata: NormalizedFormMetadata;
}

/** Inputs for resolver + rules (expand over time) */
export interface TransactionPaperworkContext {
  transactionId: string;
  /** Primary jurisdiction — usually from property.state */
  propertyState: string;
  propertyType: string;
  side: "SELL" | "BUY";
  flags?: Record<string, boolean>;
}

export interface PaperworkGenerationOptions {
  catalog: FormCatalog;
  rulesById: Record<string, DocumentRequirementRule>;
  templatesById: Record<string, TransactionTemplate>;
  profilesById: Record<string, JurisdictionProfile>;
  overlay?: BrokerageOverlay | null;
  /** Inject stable ids in tests */
  createId?: () => string;
}
