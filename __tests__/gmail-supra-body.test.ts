import {
  htmlToPlainText,
  pickSupraRawBodyFromChunks,
} from "@/lib/adapters/gmail";

describe("Gmail Supra body extraction helpers", () => {
  describe("htmlToPlainText", () => {
    it("breaks table cells onto separate lines for address / city rows", () => {
      const html = `<table><tr><td>1200 Congress Ave</td><td>Austin, TX 78701</td></tr></table>`;
      const plain = htmlToPlainText(html);
      expect(plain).toContain("1200 Congress Ave");
      expect(plain).toContain("Austin, TX 78701");
      expect(plain.indexOf("78701")).toBeGreaterThan(plain.indexOf("Congress"));
    });

    it("preserves br as newlines", () => {
      expect(htmlToPlainText("a<br/>b")).toBe("a\nb");
    });
  });

  describe("pickSupraRawBodyFromChunks", () => {
    it("prefers HTML when plain is thin but HTML has full Supra copy", () => {
      const plain = ["View message\n\n— Supra"];
      const html = [
        "The showing by X (x@example.com) at 1 Main St, Dallas, TX 75201 (KeyBox# 1) began 01/02/2025 3:00PM",
      ];
      expect(pickSupraRawBodyFromChunks(plain, html)).toBe(html[0]);
    });

    it("prefers HTML when plain omits “the showing by” but HTML has it", () => {
      const plain = ["You have a new message from Supra Showings."];
      const html = [
        "The showing by Agent (a@b.com) at 10 Oak St, Plano, TX 75023 (KeyBox# 2) began 03/01/2025 1:00PM",
      ];
      expect(pickSupraRawBodyFromChunks(plain, html)).toBe(html[0]);
    });

    it("uses plain when it is already the full notification", () => {
      const full =
        "The showing by X (x@example.com) at 1 Main St, Dallas, TX 75201 (KeyBox# 1) began 01/02/2025 3:00PM";
      expect(pickSupraRawBodyFromChunks([full], ["short html snippet"])).toBe(full);
    });
  });
});
