import type { FarmStructureVisibility } from "@/lib/validations/farm-structure-visibility";

export type FarmPerformanceHealthAreaRow = {
  farmAreaId: string;
  farmAreaName: string;
  territoryId: string;
  territoryName: string;
  totalContacts: number;
  withEmail: number;
  withPhone: number;
  withMailingAddress: number;
  withSiteAddress: number;
  missingEmail: number;
  missingPhone: number;
  missingMailingAddress: number;
  missingSiteAddress: number;
  farmStageReadyToPromote: number;
  pctWithEmail: number;
  pctWithPhone: number;
  pctWithMailingAddress: number;
  pctWithSiteAddress: number;
};

export type FarmPerformanceHealthSummary = {
  totalContacts: number;
  withEmail: number;
  withPhone: number;
  withMailingAddress: number;
  withSiteAddress: number;
  missingEmail: number;
  missingPhone: number;
  missingMailingAddress: number;
  missingSiteAddress: number;
  farmStageReadyToPromote: number;
  pctWithEmail: number;
  pctWithPhone: number;
  pctWithMailingAddress: number;
  pctWithSiteAddress: number;
  areasWithContacts: number;
  areasNeedingCleanup: number;
};

export type FarmPerformanceHealthPayload = {
  visibility: FarmStructureVisibility;
  areas: FarmPerformanceHealthAreaRow[];
  summary: FarmPerformanceHealthSummary;
};

export async function fetchFarmPerformanceHealth(
  visibility: FarmStructureVisibility
): Promise<FarmPerformanceHealthPayload> {
  const qs = `visibility=${encodeURIComponent(visibility)}`;
  const res = await fetch(`/api/v1/farm/performance-health?${qs}`);
  const json = (await res.json()) as {
    error?: { message?: string };
    data?: FarmPerformanceHealthPayload;
  };
  if (!res.ok || json.error) {
    throw new Error(json.error?.message ?? "Failed to load farm health");
  }
  if (!json.data) throw new Error("Invalid farm health response");
  return json.data;
}
