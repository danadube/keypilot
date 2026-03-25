import { diagnoseSupraImportedBody } from "@/lib/integrations/supra/diagnose-supra-imported-body";
import {
  PDF_EXACT_NEW_SHOWING_BODY,
} from "@/lib/integrations/supra/supra-email-fixtures";

describe("diagnoseSupraImportedBody", () => {
  it("flags full new-showing PDF fixture shape", () => {
    const d = diagnoseSupraImportedBody(PDF_EXACT_NEW_SHOWING_BODY);
    expect(d.hasTheShowingBy).toBe(true);
    expect(d.hasKeyBox).toBe(true);
    expect(d.hasBegan).toBe(true);
    expect(d.hasHasEnded).toBe(false);
    expect(d.hasAtStreetNumber).toBe(true);
    expect(d.looksLikeSnippetOnly).toBe(false);
  });

  it("flags likely Gmail snippet fallback", () => {
    const d = diagnoseSupraImportedBody("You have a new Supra message.");
    expect(d.looksLikeSnippetOnly).toBe(true);
    expect(d.hasTheShowingBy).toBe(false);
  });
});
