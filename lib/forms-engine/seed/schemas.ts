import { z } from "zod";

export const RequirementBucketSchema = z.enum([
  "required",
  "conditional",
  "optional",
  "brokerage_required",
  "compliance_only",
  "operational_task",
]);

export const NormalizedFormMetadataSchema = z.object({
  formId: z.string().min(1),
  revisionId: z.string().min(1),
  title: z.string().min(1),
  shortCode: z.string().min(1),
  jurisdictionState: z.string().length(2),
  providerId: z.string().optional(),
  formFamily: z.string().min(1),
  propertyTypeTags: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  effectiveFrom: z.string().optional(),
  supersededByRevisionId: z.string().optional(),
});

export const FormCatalogEntrySchema = z.object({
  metadata: NormalizedFormMetadataSchema,
  externalRefs: z.record(z.string(), z.string()).optional(),
});

export const FormCatalogSchema = z.object({
  version: z.string(),
  generatedAt: z.string().optional(),
  entries: z.array(FormCatalogEntrySchema),
});

export const JurisdictionProfileSchema = z.object({
  id: z.string().min(1),
  stateCode: z.string().length(2),
  displayName: z.string().min(1),
  templateIdsByKey: z.record(z.string(), z.string()),
  rulePackIds: z.array(z.string()),
});

export const TransactionTemplateSchema = z.object({
  id: z.string().min(1),
  jurisdictionProfileId: z.string().min(1),
  label: z.string().min(1),
  propertyTypes: z.array(z.string()),
  side: z.enum(["SELL", "BUY", "BOTH"]),
  documentRequirementRuleIds: z.array(z.string()),
});

export const DocumentRequirementRuleSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  formId: z.string().min(1),
  revisionPin: z.string().optional(),
  bucket: RequirementBucketSchema,
  /** Validated at runtime by `evaluateRuleCondition` */
  when: z.any(),
  stageHint: z.string().optional(),
  sortOrder: z.number(),
});

export const DocumentRulesFileSchema = z.object({
  version: z.string(),
  rules: z.array(DocumentRequirementRuleSchema),
});

export const BrokerageOverlaySchema = z.object({
  id: z.string().min(1),
  brokerageId: z.string().min(1),
  additionalRuleIds: z.array(z.string()),
  formRevisionOverrides: z.record(z.string(), z.string()).optional(),
  brokerageMandatoryRuleIds: z.array(z.string()).optional(),
});

export const JurisdictionProfilesFileSchema = z.object({
  version: z.string(),
  profiles: z.array(JurisdictionProfileSchema),
});

export const TransactionTemplatesFileSchema = z.object({
  version: z.string(),
  templates: z.array(TransactionTemplateSchema),
});
