import type { FormCatalog, FormCatalogEntry, NormalizedFormMetadata } from "@/lib/forms-engine/types";

export function findCatalogEntriesByFormId(catalog: FormCatalog, formId: string): FormCatalogEntry[] {
  return catalog.entries.filter((e) => e.metadata.formId === formId);
}

/**
 * Resolve metadata for a form. Prefers explicit revision when provided (rule pin or overlay).
 * MVP: if multiple revisions exist, first match wins when revision unspecified.
 */
export function resolveFormMetadata(
  catalog: FormCatalog,
  formId: string,
  preferredRevisionId?: string | null
): NormalizedFormMetadata | null {
  const entries = findCatalogEntriesByFormId(catalog, formId);
  if (entries.length === 0) return null;
  if (preferredRevisionId) {
    const hit = entries.find((e) => e.metadata.revisionId === preferredRevisionId);
    if (hit) return { ...hit.metadata };
  }
  return { ...entries[0].metadata };
}
