/**
 * Commission calculation engine — behavior aligned with FarmTrackr `commissionCalculations.ts`,
 * adapted for KeyPilot (typed, no UI helpers here).
 */

export type TransactionInput = {
  brokerage: string;
  transactionType?: string;
  closedPrice?: string | number;
  commissionPct?: string | number;
  referralPct?: string | number;
  referralFeeReceived?: string | number;
  eo?: string | number;
  royalty?: string | number | "";
  companyDollar?: string | number | "";
  hoaTransfer?: string | number;
  homeWarranty?: string | number;
  kwCares?: string | number;
  kwNextGen?: string | number;
  boldScholarship?: string | number;
  tcConcierge?: string | number;
  jelmbergTeam?: string | number;
  bdhSplitPct?: string | number;
  preSplitDeduction?: string | number | "";
  asf?: string | number;
  foundation10?: string | number;
  adminFee?: string | number;
  brokerageSplit?: string | number;
  brokerageSplitPct?: string | number;
  otherDeductions?: string | number;
  buyersAgentSplit?: string | number;
  /** Pre-calculated NCI from import (referral / CSV path). */
  nci?: string | number;
};

export type CommissionResult = {
  gci: string;
  referralDollar: string;
  adjustedGci: string;
  royalty?: string;
  companyDollar?: string;
  preSplitDeduction?: string;
  totalBrokerageFees: string;
  nci: string;
  netVolume: string;
  bdhSplit?: string;
};

/**
 * Calculate commission breakdown for a transaction.
 */
export function calculateCommission(data: TransactionInput): CommissionResult {
  const {
    brokerage,
    transactionType = "Sale",
    closedPrice = 0,
    commissionPct = 0,
    referralPct = 0,
    referralFeeReceived = 0,
    eo = 0,
    royalty = "",
    companyDollar = "",
    hoaTransfer = 0,
    homeWarranty = 0,
    kwCares = 0,
    kwNextGen = 0,
    boldScholarship = 0,
    tcConcierge = 0,
    jelmbergTeam = 0,
    preSplitDeduction = "",
    adminFee = 0,
    brokerageSplit = 0,
    otherDeductions = 0,
    buyersAgentSplit = 0,
    nci: providedNci = undefined,
  } = data;

  const price = parseFloat(String(closedPrice)) || 0;
  const commPct = parseFloat(String(commissionPct)) || 0;
  const refPct = parseFloat(String(referralPct)) || 0;
  const refFeeReceived = parseFloat(String(referralFeeReceived)) || 0;

  let gci: number;
  let referralDollar: number;
  let adjustedGci: number;

  if (transactionType === "Referral $ Received") {
    gci = refFeeReceived;
    referralDollar = 0;
    adjustedGci = gci;

    if (providedNci !== undefined && providedNci !== null && providedNci !== "") {
      const csvNci = parseFloat(String(providedNci)) || 0;
      return {
        gci: gci.toFixed(2),
        referralDollar: "0.00",
        adjustedGci: adjustedGci.toFixed(2),
        totalBrokerageFees: (gci - csvNci).toFixed(2),
        nci: csvNci.toFixed(2),
        netVolume: price.toFixed(2),
      };
    }
    return {
      gci: gci.toFixed(2),
      referralDollar: "0.00",
      adjustedGci: adjustedGci.toFixed(2),
      totalBrokerageFees: gci.toFixed(2),
      nci: "0.00",
      netVolume: price.toFixed(2),
    };
  }

  const normalizedCommPct = commPct > 1 ? commPct / 100 : commPct;
  gci = price * normalizedCommPct;

  const normalizedRefPct = refPct > 1 ? refPct / 100 : refPct;
  referralDollar = refPct > 0 ? gci * normalizedRefPct : 0;

  adjustedGci = gci - referralDollar;

  let totalBrokerageFees = 0;
  let nci = 0;

  if (brokerage === "KW" || brokerage === "Keller Williams") {
    const royaltyValue =
      royalty !== "" && royalty !== null && royalty !== undefined
        ? parseFloat(String(royalty))
        : adjustedGci * 0.06;
    const companyDollarValue =
      companyDollar !== "" && companyDollar !== null && companyDollar !== undefined
        ? parseFloat(String(companyDollar))
        : adjustedGci * 0.1;

    totalBrokerageFees =
      (parseFloat(String(eo)) || 0) +
      royaltyValue +
      companyDollarValue +
      (parseFloat(String(hoaTransfer)) || 0) +
      (parseFloat(String(homeWarranty)) || 0) +
      (parseFloat(String(kwCares)) || 0) +
      (parseFloat(String(kwNextGen)) || 0) +
      (parseFloat(String(boldScholarship)) || 0) +
      (parseFloat(String(tcConcierge)) || 0) +
      (parseFloat(String(jelmbergTeam)) || 0) +
      (parseFloat(String(otherDeductions)) || 0) +
      (parseFloat(String(buyersAgentSplit)) || 0);

    nci = adjustedGci - totalBrokerageFees;

    return {
      gci: gci.toFixed(2),
      referralDollar: referralDollar.toFixed(2),
      adjustedGci: adjustedGci.toFixed(2),
      royalty: royaltyValue.toFixed(2),
      companyDollar: companyDollarValue.toFixed(2),
      totalBrokerageFees: totalBrokerageFees.toFixed(2),
      nci: nci.toFixed(2),
      netVolume: price.toFixed(2),
    };
  }

  if (
    brokerage === "BDH" ||
    brokerage === "Bennion Deville Homes" ||
    brokerage?.includes("Bennion Deville")
  ) {
    const expectedDeduction = adjustedGci * 0.06 + 10;
    let preSplitDeductionValue: number;

    if (preSplitDeduction !== "" && preSplitDeduction !== null && preSplitDeduction !== undefined) {
      const csvValue = parseFloat(String(preSplitDeduction));
      if (Math.abs(csvValue - expectedDeduction) < 50) {
        preSplitDeductionValue = adjustedGci - csvValue;
      } else {
        preSplitDeductionValue = csvValue;
      }
    } else {
      preSplitDeductionValue = adjustedGci - adjustedGci * 0.06 - 10;
    }

    const bdhSplitValue =
      brokerageSplit !== "" &&
      brokerageSplit !== null &&
      brokerageSplit !== undefined &&
      parseFloat(String(brokerageSplit)) > 0
        ? parseFloat(String(brokerageSplit))
        : preSplitDeductionValue * 0.1;

    const adminFeesCombined =
      (parseFloat(String(adminFee)) || 0) + (parseFloat(String(otherDeductions)) || 0);

    totalBrokerageFees = bdhSplitValue + adminFeesCombined;

    nci = preSplitDeductionValue - totalBrokerageFees;

    return {
      gci: gci.toFixed(2),
      referralDollar: referralDollar.toFixed(2),
      adjustedGci: adjustedGci.toFixed(2),
      preSplitDeduction: preSplitDeductionValue.toFixed(2),
      totalBrokerageFees: totalBrokerageFees.toFixed(2),
      nci: nci.toFixed(2),
      netVolume: price.toFixed(2),
      bdhSplit: bdhSplitValue.toFixed(2),
    };
  }

  return {
    gci: gci.toFixed(2),
    referralDollar: referralDollar.toFixed(2),
    adjustedGci: adjustedGci.toFixed(2),
    totalBrokerageFees: "0.00",
    nci: adjustedGci.toFixed(2),
    netVolume: price.toFixed(2),
  };
}
