# Jurisdiction-aware forms engine (foundation)

## Architecture summary

Paperwork for a transaction is **not** a single national checklist. It is **generated** from:

1. **Property state** → `JurisdictionProfile` (primary jurisdiction source).
2. **Transaction side** (`SELL` / `BUY`) + **property type** → `TransactionTemplate` selection.
3. **Transaction conditions** → `DocumentRequirementRule.when` (flag / property-type DSL, extensible).
4. **Form definitions** → `FormCatalog` entries with **revision-aware** `NormalizedFormMetadata`.
5. **Brokerage overlay** → optional extra rule ids, revision overrides, and brokerage-mandatory upgrades.
6. **Provider / association** → `providerId` + `formFamily` on catalog metadata (CAR, TREC, FAR, …).

Core entities (TypeScript): `FormCatalog`, `JurisdictionProfile`, `TransactionTemplate`, `DocumentRequirementRule`, `BrokerageOverlay`, `TransactionDocumentInstance`.

Pipeline UI “stages” remain **separate**; rules may carry a **non-canonical** `stageHint` string for display only—no coupling of workflow engine to catalog shape.

## File structure

```
lib/forms-engine/
  index.ts                    # Public exports
  types.ts                    # Interfaces
  catalog/lookup.ts           # Resolve FormCatalog metadata by formId + revision
  resolver/jurisdiction-resolver.ts
  rules/conditions.ts         # RuleCondition evaluation
  rules/rules-evaluator.ts    # Filter rules by context
  generator/brokerage-overlay.ts
  generator/paperwork-generator.ts
  seed/
    schemas.ts                # Zod validation for JSON
    *.seed.json               # MVP data (CA, TX, FL)
    load-mvp-seed.ts
  __tests__/paperwork-generator.test.ts
```

## MVP states

Seeded profiles and templates: **California**, **Texas**, **Florida** (`US-CA`, `US-TX`, `US-FL`).

## Integration points (next)

1. **Transaction detail / checklist** — call `generateTransactionPaperwork({ ctx, options })` where `ctx.propertyState` comes from the linked property; map `TransactionDocumentInstance[]` to UI rows or persist as child records.
2. **Replace / complement** `ca-pipeline-definitions` seed path — migrate California pipeline rows to rules-driven generation behind a feature flag.
3. **API** — optional route `POST /api/v1/transactions/:id/paperwork/rebuild` to persist instances (future).
4. **Brokerage** — load `BrokerageOverlay` from org settings and pass `options.overlay`.

## JSON schema (summary)

- **FormCatalog**: `{ version, entries: [{ metadata: NormalizedFormMetadata }] }`
- **Jurisdiction profiles file**: `{ version, profiles: JurisdictionProfile[] }`
- **Transaction templates file**: `{ version, templates: TransactionTemplate[] }`
- **Document rules file**: `{ version, rules: DocumentRequirementRule[] }` (`when` validated at runtime)

Zod schemas: `lib/forms-engine/seed/schemas.ts`.
