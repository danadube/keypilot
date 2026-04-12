import type { BrokerageOverlay, DocumentRequirementRule, RequirementBucket } from "@/lib/forms-engine/types";

/** Merge base template rule order with overlay additions (dedupe, preserve order) */
export function mergeRuleIdsWithOverlay(
  baseRuleIds: string[],
  overlay: BrokerageOverlay | null | undefined
): string[] {
  if (!overlay) return [...baseRuleIds];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of [...baseRuleIds, ...overlay.additionalRuleIds, ...(overlay.brokerageMandatoryRuleIds ?? [])]) {
    if (!seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

/** Resolve revision id for a form given catalog entry and overlay overrides */
export function resolveRevisionId(
  formId: string,
  ruleRevisionPin: string | undefined,
  overlay: BrokerageOverlay | null | undefined
): string {
  const fromOverlay = overlay?.formRevisionOverrides?.[formId];
  if (fromOverlay) return fromOverlay;
  if (ruleRevisionPin) return ruleRevisionPin;
  throw new Error(`Missing revision for form ${formId} (no pin and no overlay override)`);
}

/** If rule is listed as brokerage mandatory, upgrade bucket to brokerage_required when applicable */
export function effectiveBucket(
  rule: DocumentRequirementRule,
  overlay: BrokerageOverlay | null | undefined
): RequirementBucket {
  if (!overlay?.brokerageMandatoryRuleIds?.includes(rule.id)) {
    return rule.bucket;
  }
  if (rule.bucket === "required") return "required";
  if (rule.bucket === "compliance_only" || rule.bucket === "operational_task") {
    return rule.bucket;
  }
  return "brokerage_required";
}
