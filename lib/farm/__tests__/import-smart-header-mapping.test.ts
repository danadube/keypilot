import {
  buildImportMappingFromHeaders,
  EMPTY_IMPORT_MAPPING,
  normalizeImportHeaderLabel,
  IMPORT_HEADER_ALIASES,
  IMPORT_HEADER_STRONG,
  IMPORT_HEADER_WEAK,
} from "../import-smart-header-mapping";

describe("normalizeImportHeaderLabel", () => {
  it("trims, lowercases, underscores to spaces, collapses whitespace", () => {
    expect(normalizeImportHeaderLabel("  FIRST_NAME  ")).toBe("first name");
    expect(normalizeImportHeaderLabel("Email\t Address")).toBe("email address");
  });
});

function assertNormalizedAliasKeys(record: Readonly<Record<string, unknown>>) {
  for (const k of Object.keys(record)) {
    expect(k.length).toBeGreaterThan(0);
    expect(k).toBe(k.trim().toLowerCase());
    expect(k).not.toMatch(/\s{2,}/);
  }
}

describe("IMPORT_HEADER_STRONG / IMPORT_HEADER_WEAK", () => {
  it("strong keys are normalized", () => {
    assertNormalizedAliasKeys(IMPORT_HEADER_STRONG);
  });
  it("weak keys are normalized", () => {
    assertNormalizedAliasKeys(IMPORT_HEADER_WEAK);
  });
});

describe("IMPORT_HEADER_ALIASES (merged)", () => {
  it("has no empty keys", () => {
    for (const k of Object.keys(IMPORT_HEADER_ALIASES)) {
      expect(k.length).toBeGreaterThan(0);
      expect(k).toBe(k.trim().toLowerCase());
      expect(k).not.toMatch(/\s{2,}/);
    }
  });
});

describe("buildImportMappingFromHeaders", () => {
  it("maps common variants to fields using original header strings", () => {
    const headers = ["E-mail", "Mobile", "FName", "LNAME", "Territory", "Farm Area"];
    const { mapping, smartMappedFieldCount, strongMappedCount, weakMappedCount } =
      buildImportMappingFromHeaders(headers);
    expect(mapping.email).toBe("E-mail");
    expect(mapping.phone2).toBe("Mobile");
    expect(mapping.firstName).toBe("FName");
    expect(mapping.lastName).toBe("LNAME");
    expect(mapping.territory).toBe("Territory");
    expect(mapping.area).toBe("Farm Area");
    expect(smartMappedFieldCount).toBe(6);
    expect(strongMappedCount).toBe(6);
    expect(weakMappedCount).toBe(0);
  });

  it("does not overwrite non-null base fields", () => {
    const base = { ...EMPTY_IMPORT_MAPPING, email: "Already" };
    const { mapping, smartMappedFieldCount } = buildImportMappingFromHeaders(
      ["Email Address", "Phone"],
      base
    );
    expect(mapping.email).toBe("Already");
    expect(mapping.phone).toBe("Phone");
    expect(smartMappedFieldCount).toBe(1);
  });

  it("first matching header wins per field", () => {
    const { mapping } = buildImportMappingFromHeaders(["Email", "E-mail"]);
    expect(mapping.email).toBe("Email");
  });

  it("tags weak matches in confidence", () => {
    const { mapping, confidence, weakMappedCount, strongMappedCount } =
      buildImportMappingFromHeaders(["email", "Phone number"]);
    expect(mapping.email).toBe("email");
    expect(confidence.email).toBe("weak");
    expect(mapping.phone).toBe("Phone number");
    expect(confidence.phone).toBe("strong");
    expect(weakMappedCount).toBe(1);
    expect(strongMappedCount).toBe(1);
  });

  it("returns zero smart count when no aliases match", () => {
    const { mapping, smartMappedFieldCount } = buildImportMappingFromHeaders([
      "Foo",
      "Bar",
      "Qux",
    ]);
    expect(mapping).toEqual(EMPTY_IMPORT_MAPPING);
    expect(smartMappedFieldCount).toBe(0);
  });

  it("does not map ambiguous standalone farm", () => {
    const { mapping } = buildImportMappingFromHeaders(["farm"]);
    expect(mapping.territory).toBeNull();
    expect(mapping.area).toBeNull();
  });
});
