import type {
  DocumentStatus,
  PipelineSide,
  PipelineStageKey,
  RequirementKind,
} from "@/lib/transactions/ca-pipeline-definitions";

const META_PREFIX = "KP_PIPELINE_META:";

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
        if (j?.v === 1 && j.code && j.stage && j.docStatus) return j;
      } catch {
        return null;
      }
    }
    return null;
  }
  try {
    const j = JSON.parse(t.slice(META_PREFIX.length)) as PipelineChecklistMetaV1;
    if (j?.v === 1 && j.code && j.stage && j.docStatus) return j;
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
