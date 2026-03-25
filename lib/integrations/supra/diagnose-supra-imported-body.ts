/**
 * Heuristic flags for comparing live Gmail-imported `rawBodyText` to expected Supra PDF shapes.
 */

export type SupraImportedBodyDiagnostics = {
  bodyLength: number;
  hasTheShowingBy: boolean;
  hasKeyBox: boolean;
  hasBegan: boolean;
  hasHasEnded: boolean;
  hasAtStreetNumber: boolean;
  /** Gmail snippet fallback when MIME bodies are empty */
  looksLikeSnippetOnly: boolean;
  firstLine: string;
};

export function diagnoseSupraImportedBody(rawBodyText: string): SupraImportedBodyDiagnostics {
  const t = rawBodyText ?? "";
  const hasTheShowingBy = /\bthe\s+showing\s+by\b/i.test(t);
  return {
    bodyLength: t.length,
    hasTheShowingBy,
    hasKeyBox: /\bKeyBox#/i.test(t),
    hasBegan: /\bbegan\b/i.test(t),
    hasHasEnded: /\bhas\s+ended\b/i.test(t),
    hasAtStreetNumber: /\bat\s+\d/.test(t),
    looksLikeSnippetOnly: t.length < 120 && !hasTheShowingBy,
    firstLine: t.split(/\r?\n/)[0]?.slice(0, 240) ?? "",
  };
}
