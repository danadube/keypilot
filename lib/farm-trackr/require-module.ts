import type { User } from "@prisma/client";
import { hasModuleAccess, type ModuleAccessMap } from "@/lib/module-access";

function moduleAccessFromUser(user: User): ModuleAccessMap | null {
  const raw = user.moduleAccess;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as ModuleAccessMap;
}

/** Server-side gate aligned with ModuleGate (farm-trackr module flag on User.moduleAccess). */
export function userHasFarmTrackrAccess(user: User): boolean {
  return hasModuleAccess(moduleAccessFromUser(user), "farm-trackr");
}
