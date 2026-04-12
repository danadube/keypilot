import type { TransactionPaperworkContext } from "@/lib/forms-engine/types";
import { normalizeStateCode } from "@/lib/forms-engine/resolver/jurisdiction-resolver";

export type BuildTransactionPaperworkContextInput = {
  transactionId: string;
  propertyState: string | null | undefined;
  side: "SELL" | "BUY";
  propertyType?: string | null;
  flags?: Record<string, boolean>;
  yearBuilt?: number | null;
  hasHoa?: boolean | null;
  occupancyType?: string | null;
  brokerageId?: string | null;
  agentUserId?: string | null;
  agentDisplayName?: string | null;
};

/**
 * Build paperwork context from transaction + property fields already on the client.
 * Returns null when jurisdiction cannot be resolved (e.g. missing state).
 */
export function buildTransactionPaperworkContext(
  input: BuildTransactionPaperworkContextInput
): TransactionPaperworkContext | null {
  const code = normalizeStateCode(input.propertyState ?? "");
  if (!code) return null;

  const ctx: TransactionPaperworkContext = {
    transactionId: input.transactionId,
    propertyState: code,
    propertyType: (input.propertyType?.trim() || "residential").toLowerCase(),
    side: input.side,
    flags:
      input.flags && Object.keys(input.flags).length > 0 ? { ...input.flags } : undefined,
  };

  if (input.yearBuilt != null) ctx.yearBuilt = input.yearBuilt;
  if (input.hasHoa != null) ctx.hasHoa = input.hasHoa;
  if (input.occupancyType?.trim()) ctx.occupancyType = input.occupancyType.trim();
  if (input.brokerageId?.trim()) ctx.brokerageId = input.brokerageId.trim();
  if (input.agentUserId?.trim()) ctx.agentUserId = input.agentUserId.trim();
  if (input.agentDisplayName?.trim()) ctx.agentDisplayName = input.agentDisplayName.trim();

  return ctx;
}
