import {
  htmlToPlainText,
  pickSupraRawBodyFromChunks,
} from "@/lib/adapters/gmail";
import { parseSupraEmailToDraft } from "@/lib/integrations/supra/parse-supra-email";
import {
  PDF_EXACT_END_SHOWING_BODY,
  PDF_EXACT_NEW_SHOWING_BODY,
} from "@/lib/integrations/supra/supra-email-fixtures";

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

  describe("PDF-exact Supra copy vs Gmail HTML→text pipeline", () => {
    it("new showing: table-wrapped HTML normalizes to the same parse as the PDF fixture body", () => {
      const html = `<table>
<tr><td>The showing by John McKenna( jmckenna@windermere.com) at 479 Desert Holly Drive, Palm Desert, CA 92211</td></tr>
<tr><td>(KeyBox# 32287084) began 03/20/2026 2:34PM</td></tr>
<tr><td>For additional information on your showings please login to SupraWEB.</td></tr>
</table>`;
      const fromHtml = htmlToPlainText(html);
      const thinPlain = ["Open in browser\n\n— Supra"];
      const extracted = pickSupraRawBodyFromChunks([thinPlain.join("\n")], [fromHtml]);

      const ref = parseSupraEmailToDraft({
        subject: "Supra Showings - New Showing Notification",
        rawBodyText: PDF_EXACT_NEW_SHOWING_BODY,
        sender: "suprashowing@suprasystems.com",
      });
      const got = parseSupraEmailToDraft({
        subject: "Supra Showings - New Showing Notification",
        rawBodyText: extracted,
        sender: "suprashowing@suprasystems.com",
      });

      expect(got.parsedAddress1).toBe(ref.parsedAddress1);
      expect(got.parsedCity).toBe(ref.parsedCity);
      expect(got.parsedState).toBe(ref.parsedState);
      expect(got.parsedZip).toBe(ref.parsedZip);
      expect(got.parsedScheduledAt?.getTime()).toBe(ref.parsedScheduledAt?.getTime());
      expect(got.parsedAgentEmail).toBe(ref.parsedAgentEmail);
      expect(got.proposedAction).toBe(ref.proposedAction);
    });

    it("end showing: table-split street / city rows match PDF fixture parse", () => {
      const html = `<table>
<tr><td>The Supra system detected the showing by John McKenna ( jmckenna@windermere.com) at 479 Desert Holly Drive,</td></tr>
<tr><td>Palm Desert, CA 92211 (KeyBox# 32287084) that began 03/20/2026 2:34PM has ended 03/20/2026 2:47PM.</td></tr>
<tr><td>Estimated showing duration is 13 minutes.</td></tr>
</table>`;
      const fromHtml = htmlToPlainText(html);
      const thinPlain = ["Notification\n\nSupra"];
      const extracted = pickSupraRawBodyFromChunks(thinPlain, [fromHtml]);

      const ref = parseSupraEmailToDraft({
        subject: "Supra Showings - End of Showing Notification",
        rawBodyText: PDF_EXACT_END_SHOWING_BODY,
        sender: "suprashowing@suprasystems.com",
      });
      const got = parseSupraEmailToDraft({
        subject: "Supra Showings - End of Showing Notification",
        rawBodyText: extracted,
        sender: "suprashowing@suprasystems.com",
      });

      expect(got.parsedAddress1).toBe(ref.parsedAddress1);
      expect(got.parsedCity).toBe(ref.parsedCity);
      expect(got.parsedState).toBe(ref.parsedState);
      expect(got.parsedZip).toBe(ref.parsedZip);
      expect(got.parsedScheduledAt?.getTime()).toBe(ref.parsedScheduledAt?.getTime());
      expect(got.parsedShowingBeganAt?.getTime()).toBe(
        ref.parsedShowingBeganAt?.getTime()
      );
      expect(got.proposedAction).toBe(ref.proposedAction);
    });
  });
});
