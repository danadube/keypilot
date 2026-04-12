/**
 * KeyPilot jurisdiction-aware forms engine (foundation).
 * Generate transaction paperwork from rules + catalog — not a single national list.
 */

export type {
  BrokerageOverlay,
  DocumentRequirementRule,
  FormCatalog,
  FormCatalogEntry,
  JurisdictionProfile,
  NormalizedFormMetadata,
  PaperworkGenerationOptions,
  RequirementBucket,
  RuleCondition,
  TransactionDocumentInstance,
  TransactionDocumentInstanceStatus,
  TransactionPaperworkContext,
  TransactionTemplate,
} from "@/lib/forms-engine/types";

export { resolveFormMetadata, findCatalogEntriesByFormId } from "@/lib/forms-engine/catalog/lookup";
export {
  mergeRuleIdsWithOverlay,
  effectiveBucket,
} from "@/lib/forms-engine/generator/brokerage-overlay";
export { generateTransactionPaperwork } from "@/lib/forms-engine/generator/paperwork-generator";
export type { GeneratePaperworkInput, GeneratePaperworkResult } from "@/lib/forms-engine/generator/paperwork-generator";
export {
  normalizeStateCode,
  resolveJurisdictionProfile,
  resolveTransactionTemplateId,
  templateAppliesToContext,
  templateMatchKey,
  getTemplateOrThrow,
} from "@/lib/forms-engine/resolver/jurisdiction-resolver";
export { evaluateRuleCondition } from "@/lib/forms-engine/rules/conditions";
export { filterApplicableRules } from "@/lib/forms-engine/rules/rules-evaluator";
export { loadMvpFormsEngineSeed } from "@/lib/forms-engine/seed/load-mvp-seed";
export {
  FormCatalogSchema,
  DocumentRulesFileSchema,
  JurisdictionProfilesFileSchema,
  TransactionTemplatesFileSchema,
  BrokerageOverlaySchema,
} from "@/lib/forms-engine/seed/schemas";
