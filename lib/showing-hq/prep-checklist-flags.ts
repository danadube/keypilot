/** Merge JSON prep checklist flags for PATCH/PUT bodies (server stores schemaless JSON). */

export function mergePrepChecklistFlags(
  existing: Record<string, unknown> | null | undefined,
  patch: Record<string, boolean>
): Record<string, unknown> {
  const base =
    existing && typeof existing === "object" && !Array.isArray(existing)
      ? { ...existing }
      : {};
  return { ...base, ...patch };
}
