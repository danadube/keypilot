/**
 * Back-compat entry: re-exports the Supra v1 email parser.
 * Prefer importing from `./parse-supra-email` in new code.
 */

export {
  parseSupraEmailToDraft,
  type SupraParseDraft,
  type SupraEventIntent,
} from "./parse-supra-email";

import { parseSupraEmailToDraft, type SupraParseDraft } from "./parse-supra-email";

/** Shape expected by Prisma update (no `parsedSourceHint` column) */
export type SupraManualParseDraft = Omit<SupraParseDraft, "parsedSourceHint">;

export function buildManualParseDraftFromRaw(
  input: Parameters<typeof parseSupraEmailToDraft>[0]
): SupraManualParseDraft {
  const r = parseSupraEmailToDraft(input);
  const { parsedSourceHint, ...rest } = r;
  void parsedSourceHint;
  return rest;
}
