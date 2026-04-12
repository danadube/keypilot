import type { RuleCondition, TransactionPaperworkContext } from "@/lib/forms-engine/types";

export function evaluateRuleCondition(
  condition: RuleCondition,
  ctx: TransactionPaperworkContext
): boolean {
  switch (condition.type) {
    case "always":
      return true;
    case "property_type":
      return ctx.propertyType === condition.value;
    case "transaction_flag":
      return Boolean(ctx.flags?.[condition.flag]);
    case "and":
      return (condition.children ?? []).every((c) => evaluateRuleCondition(c, ctx));
    case "or":
      return (condition.children ?? []).some((c) => evaluateRuleCondition(c, ctx));
    case "not":
      return !evaluateRuleCondition(condition.child, ctx);
    default: {
      const _exhaustive: never = condition;
      return _exhaustive;
    }
  }
}
