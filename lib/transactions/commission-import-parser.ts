import {
  ParsedCommissionStatementSchema,
  type ParsedCommissionStatement,
} from "@/lib/validations/transaction-import";

const DEFAULT_PARSER_VERSION = "v1-rule-based";

type ParseCommissionStatementInput = {
  pdfText: string;
  fileName: string;
  mimeType: "application/pdf";
  pageCount: number;
  parserVersion?: string;
};

function normalizeText(input: string): string {
  return input.replace(/\r/g, "\n").replace(/[ \t]+/g, " ").trim();
}

function parseMoneyFromMatch(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const cleaned = value.replace(/[,$()\s]/g, "").replace(/^\-/, "");
  const n = Number.parseFloat(cleaned);
  if (!Number.isFinite(n)) return undefined;
  return Math.abs(n);
}

function parseDateFromMatch(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const m = value.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (!m) return undefined;
  const mm = m[1].padStart(2, "0");
  const dd = m[2].padStart(2, "0");
  const yyyy = m[3].length === 2 ? `20${m[3]}` : m[3];
  return `${yyyy}-${mm}-${dd}`;
}

function capture(text: string, patterns: RegExp[]): string | undefined {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return undefined;
}

function collectParties(text: string, label: "buyer" | "seller"): string[] {
  const rx = new RegExp(`${label}s?\\s*[:\\-]\\s*([^\\n]+)`, "gi");
  const values: string[] = [];
  let match: RegExpExecArray | null = rx.exec(text);
  while (match) {
    if (match[1]) {
      const names = match[1]
        .split(/,|&| and /i)
        .map((v) => v.trim())
        .filter(Boolean);
      values.push(...names);
    }
    match = rx.exec(text);
  }
  return Array.from(new Set(values));
}

export function parseCommissionStatementFromPdfText(
  input: ParseCommissionStatementInput
): ParsedCommissionStatement {
  const parserVersion = input.parserVersion ?? DEFAULT_PARSER_VERSION;
  const text = normalizeText(input.pdfText);

  const warnings: string[] = [];
  const fieldConfidence: Record<string, number> = {};

  const propertyAddress = capture(text, [
    /property address\s*[:\-]\s*([^\n]+)/i,
    /subject property\s*[:\-]\s*([^\n]+)/i,
    /\n(\d{2,6}\s+[^\n,]+,\s*[^\n]+)/i,
  ]);
  if (propertyAddress) fieldConfidence.propertyAddress = 0.8;

  const closeDateRaw = capture(text, [
    /close(?:\s*of)?\s*escrow\s*[:\-]\s*([0-9\/\-]{6,10})/i,
    /close(?:d|)\s*date\s*[:\-]\s*([0-9\/\-]{6,10})/i,
  ]);
  const closeDate = parseDateFromMatch(closeDateRaw);
  if (closeDate) fieldConfidence.closeDate = 0.85;

  const contractDateRaw = capture(text, [
    /contract\s*date\s*[:\-]\s*([0-9\/\-]{6,10})/i,
    /agreement\s*date\s*[:\-]\s*([0-9\/\-]{6,10})/i,
  ]);
  const contractDate = parseDateFromMatch(contractDateRaw);
  if (contractDate) fieldConfidence.contractDate = 0.75;

  const expirationDateRaw = capture(text, [
    /expiration\s*date\s*[:\-]\s*([0-9\/\-]{6,10})/i,
    /expires\s*[:\-]\s*([0-9\/\-]{6,10})/i,
  ]);
  const expirationDate = parseDateFromMatch(expirationDateRaw);
  if (expirationDate) fieldConfidence.expirationDate = 0.7;

  const salePriceRaw = capture(text, [
    /sale\s*price\s*[:\-]\s*\$?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    /purchase\s*price\s*[:\-]\s*\$?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
  ]);
  const salePrice = parseMoneyFromMatch(salePriceRaw);
  if (salePrice !== undefined) fieldConfidence.salePrice = 0.9;

  const grossCommissionRaw = capture(text, [
    /\b(?:gci|gross commission(?: income)?)\s*[:\-]?\s*\$?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
  ]);
  const grossCommission = parseMoneyFromMatch(grossCommissionRaw);
  if (grossCommission !== undefined) fieldConfidence.grossCommission = 0.8;

  const brokerageFeesRaw = capture(text, [
    /brokerage\s*fees?\s*[:\-]?\s*\$?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    /company\s*dollar\s*[:\-]?\s*\$?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
  ]);
  const brokerageFeesTotal = parseMoneyFromMatch(brokerageFeesRaw);
  if (brokerageFeesTotal !== undefined) fieldConfidence.brokerageFeesTotal = 0.7;

  const deductionsRaw = capture(text, [
    /total\s*deductions?\s*[:\-]?\s*\$?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    /\bdeductions?\s*[:\-]?\s*\$?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
  ]);
  const deductionsTotal = parseMoneyFromMatch(deductionsRaw);
  if (deductionsTotal !== undefined) fieldConfidence.deductionsTotal = 0.7;

  const netToAgentRaw = capture(text, [
    /\b(?:net to agent|agent check|net commission|1099(?: income)?)\s*[:\-]?\s*\$?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
  ]);
  const netToAgent = parseMoneyFromMatch(netToAgentRaw);
  if (netToAgent !== undefined) fieldConfidence.netToAgent = 0.85;

  const brokerageName = capture(text, [
    /brokerage\s*[:\-]\s*([^\n]+)/i,
    /office\s*[:\-]\s*([^\n]+)/i,
  ]);
  if (brokerageName) fieldConfidence.brokerageName = 0.7;

  const officeName = capture(text, [/office\s*name\s*[:\-]\s*([^\n]+)/i]);
  if (officeName) fieldConfidence.officeName = 0.65;

  const transactionExternalId = capture(text, [
    /transaction\s*(?:id|#|number)\s*[:\-]\s*([A-Za-z0-9\-]+)/i,
    /file\s*(?:id|#)\s*[:\-]\s*([A-Za-z0-9\-]+)/i,
  ]);
  if (transactionExternalId) fieldConfidence.transactionExternalId = 0.65;

  let transactionType: ParsedCommissionStatement["extracted"]["transactionType"] =
    "UNKNOWN";
  if (/lease/i.test(text)) transactionType = "LEASE";
  if (/referral\s+out/i.test(text)) transactionType = "REFERRAL_OUT";
  if (/referral\s+in|referral\s+received/i.test(text)) {
    transactionType = "REFERRAL_IN";
  }
  if (transactionType === "UNKNOWN" && salePrice !== undefined) {
    transactionType = "SALE";
  }
  fieldConfidence.transactionType = transactionType === "UNKNOWN" ? 0.3 : 0.7;

  const buyers = collectParties(text, "buyer").map((raw) => ({ raw }));
  if (buyers.length > 0) fieldConfidence.buyers = 0.6;

  const sellers = collectParties(text, "seller").map((raw) => ({ raw }));
  if (sellers.length > 0) fieldConfidence.sellers = 0.6;

  const lineItems: ParsedCommissionStatement["extracted"]["lineItems"] = [];
  if (grossCommission !== undefined) {
    lineItems.push({
      label: "Gross Commission",
      amount: grossCommission,
      category: "GCI",
      confidence: 0.8,
    });
  }
  if (brokerageFeesTotal !== undefined) {
    lineItems.push({
      label: "Brokerage Fees",
      amount: brokerageFeesTotal,
      category: "BROKER_FEE",
      confidence: 0.7,
    });
  }
  if (deductionsTotal !== undefined) {
    lineItems.push({
      label: "Deductions",
      amount: deductionsTotal,
      category: "DEDUCTION",
      confidence: 0.7,
    });
  }
  if (netToAgent !== undefined) {
    lineItems.push({
      label: "Net To Agent",
      amount: netToAgent,
      category: "NET",
      confidence: 0.85,
    });
  }

  const missingRequired: string[] = [];
  if (!propertyAddress) missingRequired.push("propertyAddress");
  if (!closeDate) missingRequired.push("closeDate");
  if (salePrice === undefined) missingRequired.push("salePrice");

  if (!propertyAddress) {
    warnings.push("Could not confidently detect property address from statement.");
  }
  if (!closeDate) {
    warnings.push("Could not confidently detect close date.");
  }
  if (salePrice === undefined) {
    warnings.push("Could not confidently detect sale price.");
  }
  if (lineItems.length === 0) {
    warnings.push("No clear commission line items found.");
  }

  const confidenceValues = Object.values(fieldConfidence);
  const overallConfidence =
    confidenceValues.length > 0
      ? Number(
          (
            confidenceValues.reduce((sum, value) => sum + value, 0) /
            confidenceValues.length
          ).toFixed(4)
        )
      : 0.2;

  const parsed = {
    source: {
      fileName: input.fileName,
      mimeType: input.mimeType,
      pageCount: input.pageCount,
      parserVersion,
    },
    extracted: {
      propertyAddress,
      transactionType,
      contractDate,
      closeDate,
      expirationDate,
      buyers,
      sellers,
      salePrice,
      grossCommission,
      brokerageFeesTotal,
      deductionsTotal,
      netToAgent,
      transactionExternalId,
      brokerageName,
      officeName,
      lineItems,
    },
    scoring: {
      overallConfidence,
      fieldConfidence,
      warnings,
      missingRequired,
    },
  };

  return ParsedCommissionStatementSchema.parse(parsed);
}
