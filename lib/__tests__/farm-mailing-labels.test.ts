import { AVERY_5160, avery5160ColumnGapInches } from "@/lib/farm/labels/label-formats";
import {
  buildAvery5160PrintHtml,
  chunkToPages,
  escapeHtml,
} from "@/lib/farm/labels/render-label-sheet";
import { buildMailingListCsv } from "@/lib/farm/mailing/mailing-list-csv";
import {
  contactToMailingRecipient,
  hasUsableMailingAddress,
} from "@/lib/farm/mailing/recipients";

describe("AVERY_5160", () => {
  it("is 3×10 per page", () => {
    expect(AVERY_5160.columns * AVERY_5160.rows).toBe(30);
    expect(AVERY_5160.labelsPerPage).toBe(30);
  });

  it("has positive column gap", () => {
    expect(avery5160ColumnGapInches()).toBeGreaterThan(0);
  });
});

describe("mailing recipients", () => {
  const base = {
    id: "c1",
    firstName: "Jane",
    lastName: "Doe",
    mailingStreet1: "123 Main St",
    mailingStreet2: null as string | null,
    mailingCity: "Palm Springs",
    mailingState: "CA",
    mailingZip: "92264",
  };

  it("requires street, city, state, zip", () => {
    expect(hasUsableMailingAddress(base)).toBe(true);
    expect(hasUsableMailingAddress({ ...base, mailingStreet1: "" })).toBe(false);
    expect(hasUsableMailingAddress({ ...base, mailingStreet1: "   " })).toBe(false);
    expect(hasUsableMailingAddress({ ...base, mailingCity: "" })).toBe(false);
  });

  it("maps contact to recipient", () => {
    const r = contactToMailingRecipient(base);
    expect(r).toEqual({
      contactId: "c1",
      name: "Jane Doe",
      street: "123 Main St",
      street2: null,
      city: "Palm Springs",
      state: "CA",
      zip: "92264",
    });
  });

  it("includes street2 when present", () => {
    const r = contactToMailingRecipient({ ...base, mailingStreet2: "Apt 4" });
    expect(r?.street2).toBe("Apt 4");
  });
});

describe("buildMailingListCsv", () => {
  it("escapes quotes and commas", () => {
    const csv = buildMailingListCsv([
      {
        contactId: "1",
        name: 'Doe, "Jane"',
        street: "1 Main",
        street2: null,
        city: "City",
        state: "ST",
        zip: "12345",
      },
    ]);
    expect(csv).toContain('"Doe, ""Jane"""');
    expect(csv.split("\n")).toHaveLength(2);
  });
});

describe("render-label-sheet", () => {
  it("escapes HTML", () => {
    expect(escapeHtml("<script>")).toBe("&lt;script&gt;");
    expect(escapeHtml('a & b')).toBe("a &amp; b");
  });

  it("chunks to pages of 30", () => {
    const items = Array.from({ length: 65 }, (_, i) => i);
    const pages = chunkToPages(items, 30);
    expect(pages).toHaveLength(3);
    expect(pages[0]).toHaveLength(30);
    expect(pages[1]).toHaveLength(30);
    expect(pages[2]).toEqual([60, 61, 62, 63, 64]);
  });

  it("returns message when no recipients", () => {
    const html = buildAvery5160PrintHtml([]);
    expect(html).toContain("No mailing-ready");
  });

  it("renders one sheet for a single recipient", () => {
    const html = buildAvery5160PrintHtml([
      {
        contactId: "1",
        name: "A B",
        street: "1 St",
        street2: null,
        city: "C",
        state: "S",
        zip: "Z",
      },
    ]);
    expect(html).toContain("Avery 5160");
    expect(html).toContain("A B");
    expect(html).toContain('class="grid"');
  });
});
