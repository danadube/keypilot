import type { TransactionKind } from "@prisma/client";
import { computeTransactionFinancialsCore } from "./transaction-financials-core";
import { moneyPreviewBlockingMessage } from "./production-list-value";

export type DetailLivePreview =
  | { status: "incomplete"; message: string }
  | { status: "invalid"; message: string }
  | {
      status: "ok";
      values: {
        gci: number;
        adjustedGci: number;
        referralDollar: number;
        totalBrokerageFees: number;
        nci: number;
        netVolume: number;
      };
    };

/** Live breakdown from current form state; same engine as persist, plain numbers for the client. */
export function computeDetailLivePreview(params: {
  transactionKind: TransactionKind;
  salePrice: number | null;
  brokerageName: string | null;
  commissionInputsJson: Record<string, unknown>;
}): DetailLivePreview {
  const block = moneyPreviewBlockingMessage({
    transactionKind: params.transactionKind,
    salePrice: params.salePrice,
    commissionInputs: params.commissionInputsJson,
  });
  if (block) return { status: "incomplete", message: block };

  const core = computeTransactionFinancialsCore({
    transactionKind: params.transactionKind,
    salePrice: params.salePrice,
    brokerageName: params.brokerageName,
    commissionInputsJson: params.commissionInputsJson,
  });
  if (!core.ok) return { status: "invalid", message: core.error };

  return {
    status: "ok",
    values: {
      gci: core.gci,
      adjustedGci: core.adjustedGci,
      referralDollar: core.referralDollar,
      totalBrokerageFees: core.totalBrokerageFees,
      nci: core.nci,
      netVolume: core.netVolume,
    },
  };
}
