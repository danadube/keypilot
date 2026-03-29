/**
 * Low-risk keyword extraction from buyer-agent email replies.
 * Output is advisory; raw body remains authoritative.
 */

export type BuyerAgentReplyParsed = {
  confidence: "low" | "medium";
  interestHint?: string;
  concerns?: string[];
  pricingComment?: string;
  followUpInterest?: string;
};

const STRONG_INTEREST = /\b(very interested|strong interest|loves? it|love the|clients? love|serious interest|writing an offer|will submit|high interest)\b/i;
const MILD_INTEREST = /\b(liked? it|like the|positive|interested|could work|maybe|possibl)\b/i;
const NEGATIVE = /\b(not a fit|passing|no interest|not interested|not for (us|them)|too much work|deal breaker)\b/i;
const PRICE = /\b(price|overpriced|aggressive|value|square foot|too high|reduction|comps?)\b/i;
const SECOND_SHOWING = /\b(second showing|come back|another look|re-?visit|schedule another)\b/i;

export function parseBuyerAgentReplyLight(raw: string): BuyerAgentReplyParsed | null {
  const text = raw.trim();
  if (text.length < 12) return null;

  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const head = lines.slice(0, 6).join("\n");
  const out: BuyerAgentReplyParsed = { confidence: "low" };

  if (NEGATIVE.test(head)) {
    out.interestHint = "Sounds cautious or negative in opening lines";
    out.confidence = "medium";
  } else if (STRONG_INTEREST.test(head)) {
    out.interestHint = "Strong positive signals in opening lines";
    out.confidence = "medium";
  } else if (MILD_INTEREST.test(head)) {
    out.interestHint = "Some positive or interested language";
  }

  if (PRICE.test(head)) {
    out.pricingComment = "Mentions price / value (see raw reply)";
    if (out.confidence === "low") out.confidence = "medium";
  }

  if (SECOND_SHOWING.test(head)) {
    out.followUpInterest = "Possible interest in another visit";
    if (out.confidence === "low") out.confidence = "medium";
  }

  const concernSnips: string[] = [];
  for (const line of lines.slice(0, 8)) {
    if (/\b(concern|issue|objection|worried|hesitant|but )\b/i.test(line) && line.length < 200) {
      concernSnips.push(line.length > 120 ? line.slice(0, 117) + "…" : line);
    }
    if (concernSnips.length >= 2) break;
  }
  if (concernSnips.length) out.concerns = concernSnips;

  if (
    out.interestHint ||
    out.pricingComment ||
    out.followUpInterest ||
    (out.concerns && out.concerns.length)
  ) {
    return out;
  }
  return null;
}
