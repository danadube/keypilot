import type {
  JurisdictionProfile,
  TransactionDocumentInstance,
  TransactionPaperworkContext,
  TransactionTemplate,
} from "@/lib/forms-engine/types";
import { generateTransactionPaperwork } from "@/lib/forms-engine/generator/paperwork-generator";
import { loadMvpFormsEngineSeed } from "@/lib/forms-engine/seed/load-mvp-seed";
import { resolveJurisdictionProfile } from "@/lib/forms-engine/resolver/jurisdiction-resolver";

export type MvpPaperworkTryResult =
  | {
      ok: true;
      instances: TransactionDocumentInstance[];
      profile: JurisdictionProfile;
      template: TransactionTemplate;
    }
  | { ok: false; reason: "no_jurisdiction" | "empty" | "error"; message?: string };

/**
 * Run MVP seed + generator. Returns ok:false when the state has no profile,
 * generator yields no rows, or generation throws.
 */
export function tryMvpTransactionPaperwork(ctx: TransactionPaperworkContext | null): MvpPaperworkTryResult {
  if (!ctx) {
    return { ok: false, reason: "error", message: "Missing paperwork context" };
  }
  try {
    const { paperworkOptions, profilesById } = loadMvpFormsEngineSeed();
    const profile = resolveJurisdictionProfile(ctx.propertyState, profilesById);
    if (!profile) {
      return { ok: false, reason: "no_jurisdiction" };
    }
    const { instances, profile: p, template } = generateTransactionPaperwork({
      ctx,
      options: paperworkOptions,
    });
    if (instances.length === 0) {
      return { ok: false, reason: "empty" };
    }
    return { ok: true, instances, profile: p, template };
  } catch (e) {
    return {
      ok: false,
      reason: "error",
      message: e instanceof Error ? e.message : String(e),
    };
  }
}
