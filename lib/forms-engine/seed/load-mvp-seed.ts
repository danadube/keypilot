import type { DocumentRequirementRule, FormCatalog, JurisdictionProfile, RuleCondition, TransactionTemplate } from "@/lib/forms-engine/types";
import type { PaperworkGenerationOptions } from "@/lib/forms-engine/types";
import { FormCatalogSchema } from "@/lib/forms-engine/seed/schemas";
import { DocumentRulesFileSchema } from "@/lib/forms-engine/seed/schemas";
import { JurisdictionProfilesFileSchema } from "@/lib/forms-engine/seed/schemas";
import { TransactionTemplatesFileSchema } from "@/lib/forms-engine/seed/schemas";

import formCatalogJson from "@/lib/forms-engine/seed/form-catalog.seed.json";
import documentRulesJson from "@/lib/forms-engine/seed/document-rules.seed.json";
import jurisdictionProfilesJson from "@/lib/forms-engine/seed/jurisdiction-profiles.seed.json";
import transactionTemplatesJson from "@/lib/forms-engine/seed/transaction-templates.seed.json";

function asRuleCondition(x: unknown): RuleCondition {
  return x as RuleCondition;
}

function toRulesById(
  raw: { rules: Array<Omit<DocumentRequirementRule, "when"> & { when: unknown }> }
): Record<string, DocumentRequirementRule> {
  return Object.fromEntries(
    raw.rules.map((r) => {
      const rule: DocumentRequirementRule = {
        ...r,
        when: asRuleCondition(r.when),
      };
      return [rule.id, rule] as const;
    })
  );
}

/** Validated MVP seed: CA / TX / FL catalogs, profiles, templates, and rules */
export function loadMvpFormsEngineSeed(): {
  catalog: FormCatalog;
  profilesById: Record<string, JurisdictionProfile>;
  templatesById: Record<string, TransactionTemplate>;
  rulesById: Record<string, DocumentRequirementRule>;
  paperworkOptions: PaperworkGenerationOptions;
} {
  const catalog = FormCatalogSchema.parse(formCatalogJson);
  const profilesParsed = JurisdictionProfilesFileSchema.parse(jurisdictionProfilesJson);
  const templatesParsed = TransactionTemplatesFileSchema.parse(transactionTemplatesJson);
  const rulesParsed = DocumentRulesFileSchema.parse(documentRulesJson);

  const profilesById = Object.fromEntries(profilesParsed.profiles.map((p) => [p.id, p]));
  const templatesById = Object.fromEntries(templatesParsed.templates.map((t) => [t.id, t]));
  const rulesById = toRulesById(rulesParsed);

  const paperworkOptions: PaperworkGenerationOptions = {
    catalog,
    profilesById,
    templatesById,
    rulesById,
    overlay: null,
  };

  return { catalog, profilesById, templatesById, rulesById, paperworkOptions };
}
