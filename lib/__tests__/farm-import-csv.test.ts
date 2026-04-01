/**
 * Unit tests for the FarmTrackr CSV parser.
 */

import { parseCsvText } from "@/lib/farm/import/csv";

describe("parseCsvText", () => {
  it("returns empty headers and rows for empty input", () => {
    expect(parseCsvText("")).toEqual({ headers: [], rows: [] });
    expect(parseCsvText("   ")).toEqual({ headers: [], rows: [] });
  });

  it("parses a simple CSV with headers and one row", () => {
    const csv = "Email,First Name,Last Name\njane@example.com,Jane,Doe";
    const { headers, rows } = parseCsvText(csv);
    expect(headers).toEqual(["Email", "First Name", "Last Name"]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({
      Email: "jane@example.com",
      "First Name": "Jane",
      "Last Name": "Doe",
    });
  });

  it("strips UTF-8 BOM from the beginning", () => {
    const csv = "\uFEFFEmail,Name\ntest@test.com,Test";
    const { headers } = parseCsvText(csv);
    expect(headers[0]).toBe("Email");
  });

  it("handles CRLF line endings", () => {
    const csv = "Email,Name\r\njane@example.com,Jane\r\nbob@example.com,Bob";
    const { rows } = parseCsvText(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0].Email).toBe("jane@example.com");
    expect(rows[1].Email).toBe("bob@example.com");
  });

  it("handles quoted fields containing commas", () => {
    const csv = 'Name,Address\n"Smith, Jane","123 Main St, Suite 4"';
    const { rows } = parseCsvText(csv);
    expect(rows[0].Name).toBe("Smith, Jane");
    expect(rows[0].Address).toBe("123 Main St, Suite 4");
  });

  it("handles escaped double quotes inside quoted fields", () => {
    const csv = 'Name,Note\n"She said ""hello""",ok';
    const { rows } = parseCsvText(csv);
    expect(rows[0].Name).toBe('She said "hello"');
    expect(rows[0].Note).toBe("ok");
  });

  it("skips fully empty rows", () => {
    const csv = "Email,Name\njane@example.com,Jane\n,\nbob@example.com,Bob";
    const { rows } = parseCsvText(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0].Email).toBe("jane@example.com");
    expect(rows[1].Email).toBe("bob@example.com");
  });

  it("trims header whitespace", () => {
    const csv = " Email , Name \njane@example.com,Jane";
    const { headers } = parseCsvText(csv);
    expect(headers).toEqual(["Email", "Name"]);
  });

  it("trims cell values", () => {
    const csv = "Email,Name\n jane@example.com , Jane Doe ";
    const { rows } = parseCsvText(csv);
    expect(rows[0].Email).toBe("jane@example.com");
    expect(rows[0].Name).toBe("Jane Doe");
  });

  it("handles rows with fewer columns than headers", () => {
    const csv = "Email,Phone,Name\njane@example.com,5551234567";
    const { rows } = parseCsvText(csv);
    expect(rows[0].Email).toBe("jane@example.com");
    expect(rows[0].Phone).toBe("5551234567");
    expect(rows[0].Name).toBe("");
  });

  it("parses multiple rows correctly", () => {
    const csv = [
      "Email,Territory,Area",
      "a@example.com,South Palm Springs,Warm Sands",
      "b@example.com,North End,Vista Hills",
      "c@example.com,South Palm Springs,Canyon Ridge",
    ].join("\n");
    const { headers, rows } = parseCsvText(csv);
    expect(headers).toEqual(["Email", "Territory", "Area"]);
    expect(rows).toHaveLength(3);
    expect(rows[2].Email).toBe("c@example.com");
    expect(rows[2].Territory).toBe("South Palm Springs");
  });

  it("returns headers even if there are no data rows", () => {
    const csv = "Email,Name";
    const { headers, rows } = parseCsvText(csv);
    expect(headers).toEqual(["Email", "Name"]);
    expect(rows).toHaveLength(0);
  });
});
