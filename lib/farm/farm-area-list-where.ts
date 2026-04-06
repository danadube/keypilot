import type { Prisma } from "@prisma/client";
import type { FarmStructureVisibility } from "@/lib/validations/farm-structure-visibility";

/** Farm areas visible for structure + FarmTrackr health (matches performance-health API). */
export function farmAreaListWhere(
  userId: string,
  visibility: FarmStructureVisibility
): Prisma.FarmAreaWhereInput {
  const base: Prisma.FarmAreaWhereInput = { userId };
  if (visibility === "active") {
    return {
      ...base,
      deletedAt: null,
      territory: { deletedAt: null },
    };
  }
  if (visibility === "archived") {
    return {
      ...base,
      OR: [{ deletedAt: { not: null } }, { territory: { deletedAt: { not: null } } }],
    };
  }
  return base;
}
