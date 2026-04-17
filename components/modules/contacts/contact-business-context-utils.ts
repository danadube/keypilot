/** Stage labels for CRM pipeline records vs TransactionHQ — deal/transaction enums stay in the API. */

export function humanizeEnum(s: string): string {
  return s
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

const DEAL_STAGE: Record<string, string> = {
  INTERESTED: "Interested",
  SHOWING: "Showing",
  OFFER: "Offer",
  NEGOTIATION: "Negotiation",
  UNDER_CONTRACT: "Under contract",
  CLOSED: "Closed",
  LOST: "Lost",
};

const TRANSACTION_STAGE: Record<string, string> = {
  LEAD: "Lead",
  UNDER_CONTRACT: "Under contract",
  IN_ESCROW: "In escrow",
  PENDING: "Pending",
  CLOSED: "Closed",
  FALLEN_APART: "Fallen apart",
};

export function labelDealStage(status: string): string {
  return DEAL_STAGE[status] ?? humanizeEnum(status);
}

export function labelTransactionStage(status: string): string {
  return TRANSACTION_STAGE[status] ?? humanizeEnum(status);
}

export function formatPropertyOneLine(p: {
  address1: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
}): string {
  const line1 = p.address1?.trim() || "";
  const cityState = [p.city, p.state].filter(Boolean).join(", ");
  const tail = [cityState, p.zip].filter(Boolean).join(" ").trim();
  if (line1 && tail) return `${line1}, ${tail}`;
  return line1 || tail || "Property";
}
