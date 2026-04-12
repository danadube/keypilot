import type {
  BrokerageOverlay,
  DocumentRequirementRule,
  FormCatalog,
  JurisdictionProfile,
  TransactionDocumentInstance,
  TransactionPaperworkContext,
  TransactionTemplate,
} from "@/lib/forms-engine/types";
import type { PaperworkGenerationOptions } from "@/lib/forms-engine/types";
import { resolveFormMetadata } from "@/lib/forms-engine/catalog/lookup";
import { effectiveBucket, mergeRuleIdsWithOverlay } from "@/lib/forms-engine/generator/brokerage-overlay";
import {
  getTemplateOrThrow,
  resolveJurisdictionProfile,
  resolveTransactionTemplateId,
  templateAppliesToContext,
} from "@/lib/forms-engine/resolver/jurisdiction-resolver";
import { filterApplicableRules } from "@/lib/forms-engine/rules/rules-evaluator";

function defaultCreateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `doc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export interface GeneratePaperworkInput {
  ctx: TransactionPaperworkContext;
  options: PaperworkGenerationOptions;
}

export interface GeneratePaperworkResult {
  profile: JurisdictionProfile;
  template: TransactionTemplate;
  instances: TransactionDocumentInstance[];
}

/**
 * End-to-end: jurisdiction → template → rules (+ overlay) → document instances for UI/persistence.
 */
export function generateTransactionPaperwork(input: GeneratePaperworkInput): GeneratePaperworkResult {
  const { ctx, options } = input;
  const {
    catalog,
    rulesById,
    templatesById,
    profilesById,
    overlay = null,
    createId = defaultCreateId,
  } = options;

  const profile = resolveJurisdictionProfile(ctx.propertyState, profilesById);
  if (!profile) {
    throw new Error(`No JurisdictionProfile for state ${ctx.propertyState}`);
  }

  const templateId = resolveTransactionTemplateId(profile, ctx.propertyType, ctx.side);
  if (!templateId) {
    throw new Error(
      `No TransactionTemplate mapping for profile ${profile.id}, type ${ctx.propertyType}, side ${ctx.side}`
    );
  }

  const template = getTemplateOrThrow(templateId, templatesById);
  if (!templateAppliesToContext(template, ctx.propertyType, ctx.side)) {
    throw new Error(`Template ${template.id} does not apply to current context`);
  }

  const mergedRuleIds = mergeRuleIdsWithOverlay(template.documentRequirementRuleIds, overlay);
  const filtered = filterApplicableRules(mergedRuleIds, rulesById, ctx);

  const instances: TransactionDocumentInstance[] = filtered.map((rule, index) =>
    materializeRule(rule, ctx, catalog, overlay, createId, index)
  );

  return { profile, template, instances };
}

function materializeRule(
  rule: DocumentRequirementRule,
  ctx: TransactionPaperworkContext,
  catalog: FormCatalog,
  overlay: BrokerageOverlay | null | undefined,
  createId: () => string,
  orderIndex: number
): TransactionDocumentInstance {
  const preferredRev =
    overlay?.formRevisionOverrides?.[rule.formId] ?? rule.revisionPin ?? undefined;
  const meta = resolveFormMetadata(catalog, rule.formId, preferredRev);
  if (!meta) {
    throw new Error(`FormCatalog missing formId ${rule.formId} (rule ${rule.id})`);
  }

  const bucket = effectiveBucket(rule, overlay);

  return {
    id: createId(),
    transactionId: ctx.transactionId,
    sourceRuleId: rule.id,
    formId: meta.formId,
    revisionId: meta.revisionId,
    bucket,
    title: meta.title,
    shortCode: meta.shortCode,
    status: "not_started",
    stageHint: rule.stageHint,
    sortOrder: rule.sortOrder ?? orderIndex,
    providerId: meta.providerId,
    formFamily: meta.formFamily,
    metadata: { ...meta },
  };
}
