import type { DocumentStatus } from "@/lib/transactions/ca-pipeline-definitions";

const META_PREFIX = "KP_FORM_ENGINE_META:";

const VALID_DOC_STATUSES: readonly DocumentStatus[] = [
  "not_started",
  "sent",
  "signed",
  "uploaded",
  "complete",
];

function normalizeDocStatus(v: unknown): DocumentStatus {
  return typeof v === "string" && (VALID_DOC_STATUSES as readonly string[]).includes(v)
    ? (v as DocumentStatus)
    : "not_started";
}

/**
 * Checklist `notes` payload for rows that track forms-engine document instances.
 * Matched to generated instances by `sourceRuleId` (stable across regenerations).
 */
export type FormEngineChecklistNotesV1 = {
  v: 2;
  sourceRuleId: string;
  formId: string;
  revisionId?: string;
  docStatus: DocumentStatus;
  docUrl?: string;
  comments?: string;
};

export function serializeFormEngineChecklistNotes(meta: FormEngineChecklistNotesV1): string {
  const normalized: FormEngineChecklistNotesV1 = {
    ...meta,
    v: 2,
    docStatus: normalizeDocStatus(meta.docStatus),
  };
  return `${META_PREFIX}${JSON.stringify(normalized)}`;
}

export function tryParseFormEngineChecklistNotes(
  raw: string | null | undefined
): FormEngineChecklistNotesV1 | null {
  if (!raw?.trim()) return null;
  const t = raw.trim();
  if (!t.startsWith(META_PREFIX)) return null;
  try {
    const j = JSON.parse(t.slice(META_PREFIX.length)) as FormEngineChecklistNotesV1;
    if (j?.v !== 2 || typeof j.sourceRuleId !== "string" || typeof j.formId !== "string") {
      return null;
    }
    return {
      v: 2,
      sourceRuleId: j.sourceRuleId.trim(),
      formId: j.formId.trim(),
      revisionId: typeof j.revisionId === "string" ? j.revisionId.trim() : undefined,
      docStatus: normalizeDocStatus(j.docStatus),
      docUrl: typeof j.docUrl === "string" ? j.docUrl : undefined,
      comments: typeof j.comments === "string" ? j.comments : undefined,
    };
  } catch {
    return null;
  }
}
