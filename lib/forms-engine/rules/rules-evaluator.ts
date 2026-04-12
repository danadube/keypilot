import type { DocumentRequirementRule, TransactionPaperworkContext } from "@/lib/forms-engine/types";
import { evaluateRuleCondition } from "@/lib/forms-engine/rules/conditions";

/** Return rules whose `when` condition passes, preserving order */
export function filterApplicableRules(
  ruleIds: string[],
  rulesById: Record<string, DocumentRequirementRule>,
  ctx: TransactionPaperworkContext
): DocumentRequirementRule[] {
  const out: DocumentRequirementRule[] = [];
  for (const id of ruleIds) {
    const rule = rulesById[id];
    if (!rule) continue;
    if (evaluateRuleCondition(rule.when, ctx)) {
      out.push(rule);
    }
  }
  return out;
}
