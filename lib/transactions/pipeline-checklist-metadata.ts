import type {
  DocumentStatus,
  PipelineSide,
  PipelineStageKey,
  RequirementKind,
} from "@/lib/transactions/ca-pipeline-definitions";

const META_PREFIX = "KP_PIPELINE_META:";

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

function normalizeRequirement(v: unknown): RequirementKind {
  return v === "required" || v === "conditional" ? v : "conditional";
}

const VALID_STAGES: readonly PipelineStageKey[] = [
  "pre_listing",
  "active_listing",
  "escrow",
  "pre_offer",
  "offer_submission",
  "escrow_buyer",
];

function parseStage(v: unknown): PipelineStageKey | null {
  return typeof v === "string" && (VALID_STAGES as readonly string[]).includes(v)
    ? (v as PipelineStageKey)
    : null;
}

function parseSide(v: unknown): PipelineSide | null {
  return v === "BUY" || v === "SELL" ? v : null;
}

function coerceParsedMeta(j: PipelineChecklistMetaV1): PipelineChecklistMetaV1 | null {
  const stage = parseStage(j.stage);
  const side = parseSide(j.side);
  const code = typeof j.code === "string" ? j.code.trim() : "";
  if (!stage || !side || !code) return null;
  return {
    ...j,
    v: 1,
    code,
    side,
    stage,
    docStatus: normalizeDocStatus(j.docStatus),
    requirement: normalizeRequirement(j.requirement),
  };
}

export type PipelineChecklistMetaV1 = {
  v: 1;
  code: string;
  side: PipelineSide;
  stage: PipelineStageKey;
  requirement: RequirementKind;
  docStatus: DocumentStatus;
  docUrl?: string;
  comments?: string;
};

export function serializePipelineMeta(meta: PipelineChecklistMetaV1): string {
  return `${META_PREFIX}${JSON.stringify(meta)}`;
}

export function tryParsePipelineMeta(raw: string | null | undefined): PipelineChecklistMetaV1 | null {
  if (!raw?.trim()) return null;
  const t = raw.trim();
  if (!t.startsWith(META_PREFIX)) {
    // Legacy: whole JSON object
    if (t.startsWith("{")) {
      try {
        const j = JSON.parse(t) as PipelineChecklistMetaV1;
        if (j?.v === 1 && j.docStatus != null) {
          return coerceParsedMeta(j);
        }
      } catch {
        return null;
      }
    }
    return null;
  }
  try {
    const j = JSON.parse(t.slice(META_PREFIX.length)) as PipelineChecklistMetaV1;
    if (j?.v === 1 && j.docStatus != null) {
      return coerceParsedMeta(j);
    }
  } catch {
    return null;
  }
  return null;
}

export function buildInitialMeta(input: {
  code: string;
  side: PipelineSide;
  stage: PipelineStageKey;
  requirement: RequirementKind;
}): PipelineChecklistMetaV1 {
  return {
    v: 1,
    code: input.code,
    side: input.side,
    stage: input.stage,
    requirement: input.requirement,
    docStatus: "not_started",
  };
}

export function mergePipelineMeta(
  base: PipelineChecklistMetaV1,
  patch: Partial<Pick<PipelineChecklistMetaV1, "docStatus" | "docUrl" | "comments">>
): PipelineChecklistMetaV1 {
  return { ...base, ...patch };
}
