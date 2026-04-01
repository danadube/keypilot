import { parseCommissionStatementFromPdfText } from "@/lib/transactions/commission-import-parser";
import { applyCommissionParserProfile } from "@/lib/transactions/commission-parser-profiles";
import {
  getCommitBlockReason,
  getLowConfidenceFields,
  pickFinalStatementPayload,
  resolveSelectedBrokerageName,
} from "@/lib/transactions/commission-import-review";

describe("commission import hardening helpers", () => {
  it("detects KW brokerage and applies KW profile", () => {
    const parsed = parseCommissionStatementFromPdfText({
      pdfText:
        "Keller Williams Realty\nClose Date: 03/25/2026\nSale Price: 500000\nCompany Dollar: 1200",
      fileName: "kw.pdf",
      mimeType: "application/pdf",
      pageCount: 1,
    });

    expect(parsed.source.detectedBrokerage).toBe("KW");
    expect(parsed.source.parserProfile).toBe("kw");
  });

  it("falls back to generic profile when brokerage is not detected", () => {
    const parsed = parseCommissionStatementFromPdfText({
      pdfText: "Close Date: 03/25/2026\nSale Price: 410000",
      fileName: "generic.pdf",
      mimeType: "application/pdf",
      pageCount: 1,
    });

    expect(parsed.source.detectedBrokerage ?? null).toBeNull();
    expect(parsed.source.parserProfile).toBe("generic");

    const profile = applyCommissionParserProfile({
      text: "No known brokerage markers here",
      detectedBrokerage: null,
      extracted: parsed.extracted,
    });
    expect(profile.parserProfile).toBe("generic");
  });

  it("surfaces low-confidence fields for sparse parse output", () => {
    const parsed = parseCommissionStatementFromPdfText({
      pdfText: "Some statement text without clear amounts or dates",
      fileName: "sparse.pdf",
      mimeType: "application/pdf",
      pageCount: 1,
    });

    const lowConfidence = getLowConfidenceFields(parsed, 0.65);
    expect(lowConfidence.length).toBeGreaterThan(0);
    expect(lowConfidence.some((item) => item.field === "transactionType")).toBe(true);
  });

  it("blocks commit when critical fields are missing", () => {
    const parsed = parseCommissionStatementFromPdfText({
      pdfText: "Keller Williams Realty",
      fileName: "missing-required.pdf",
      mimeType: "application/pdf",
      pageCount: 1,
    });

    const reason = getCommitBlockReason(parsed);
    expect(reason).toContain("Can't commit yet");
    expect(reason).toContain("closing date");
    expect(reason).toContain("sale price");
  });

  it("prefers edited payload during commit payload selection", () => {
    const parsed = parseCommissionStatementFromPdfText({
      pdfText: "Close Date: 03/25/2026\nSale Price: 425000",
      fileName: "edited.pdf",
      mimeType: "application/pdf",
      pageCount: 1,
    });

    const edited = {
      ...parsed,
      extracted: {
        ...parsed.extracted,
        salePrice: 499999,
      },
    };

    const picked = pickFinalStatementPayload({
      parsedPayload: parsed,
      editedPayload: edited,
    });

    expect(picked.extracted.salePrice).toBe(499999);
  });

  it("prefers user brokerage override over detected brokerage", () => {
    const parsed = parseCommissionStatementFromPdfText({
      pdfText: "Keller Williams Realty\nClose Date: 03/25/2026\nSale Price: 500000",
      fileName: "override.pdf",
      mimeType: "application/pdf",
      pageCount: 1,
    });

    const selected = resolveSelectedBrokerageName({
      overrideBrokerageName: "My Custom Brokerage",
      statement: parsed,
    });
    const detectedOnly = resolveSelectedBrokerageName({
      overrideBrokerageName: null,
      statement: parsed,
    });

    expect(selected).toBe("My Custom Brokerage");
    expect(detectedOnly).toBe("KW");
  });
});
