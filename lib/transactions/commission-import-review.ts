import {
  ParsedCommissionStatementSchema,
  type ParsedCommissionStatement,
} from "@/lib/validations/transaction-import";

export const IMPORT_CRITICAL_FIELDS = ["closeDate", "salePrice"] as const;
type CriticalField = (typeof IMPORT_CRITICAL_FIELDS)[number];

const FIELD_LABELS: Record<string, string> = {
  propertyAddress: "Property address",
  closeDate: "Closing date",
  salePrice: "Sale price",
  brokerageName: "Brokerage",
  grossCommission: "Gross commission",
  netToAgent: "Net to agent",
};

export function prettyFieldName(field: string): string {
  return FIELD_LABELS[field] ?? field;
}

export function getMissingCriticalFields(
  statement: ParsedCommissionStatement
): CriticalField[] {
  const missing: CriticalField[] = [];
  if (!statement.extracted.closeDate) missing.push("closeDate");
  if (statement.extracted.salePrice === undefined) missing.push("salePrice");
  return missing;
}

export function getLowConfidenceFields(
  statement: ParsedCommissionStatement,
  threshold = 0.65
) {
  return Object.entries(statement.scoring.fieldConfidence)
    .filter(([, confidence]) => confidence < threshold)
    .sort((a, b) => a[1] - b[1])
    .map(([field, confidence]) => ({
      field,
      label: prettyFieldName(field),
      confidence,
    }));
}

export function getCommitBlockReason(statement: ParsedCommissionStatement): string | null {
  const missing = getMissingCriticalFields(statement);
  if (missing.length === 0) return null;
  const labels = missing.map((field) => prettyFieldName(field).toLowerCase());
  return `Can't commit yet. Add ${labels.join(" and ")} in the preview first.`;
}

export function pickFinalStatementPayload({
  parsedPayload,
  editedPayload,
}: {
  parsedPayload: unknown;
  editedPayload?: unknown;
}) {
  const sourcePayload = editedPayload ?? parsedPayload;
  return ParsedCommissionStatementSchema.parse(sourcePayload);
}

export function resolveSelectedBrokerageName({
  overrideBrokerageName,
  statement,
}: {
  overrideBrokerageName?: string | null;
  statement: ParsedCommissionStatement;
}) {
  return (
    overrideBrokerageName ??
    statement.source.detectedBrokerage ??
    statement.extracted.brokerageName ??
    null
  );
}
