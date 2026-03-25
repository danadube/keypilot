import {
  normalizeAddressLine,
  rankPropertySuggestions,
  rankShowingsByTimeProximity,
} from "@/lib/showing-hq/suggest-matches";

const sampleProp = {
  id: "p1",
  address1: "1 Main St",
  city: "Palm Desert",
  state: "CA",
  zip: "92211",
};

describe("normalizeAddressLine", () => {
  it("lowercases, strips punctuation, and expands common street types", () => {
    expect(normalizeAddressLine("  479 Desert Holly Dr.  ")).toBe("479 desert holly drive");
  });
});

describe("rankPropertySuggestions", () => {
  const candidates = [
    {
      id: "a",
      address1: "479 Desert Holly Drive",
      city: "Palm Desert",
      state: "CA",
      zip: "92211",
    },
    {
      id: "b",
      address1: "100 Main Street",
      city: "Palm Desert",
      state: "CA",
      zip: "92211",
    },
    {
      id: "c",
      address1: "479 Desert Holly Drive Unit 2",
      city: "Palm Desert",
      state: "CA",
      zip: "92211",
    },
  ];

  it("treats Dr vs Drive as exact when normalized", () => {
    const r = rankPropertySuggestions(candidates, {
      address1: "479 Desert Holly Dr",
      city: "Palm Desert",
      state: "CA",
    });
    expect(r[0]?.id).toBe("a");
    expect(r[0]?.matchKind).toBe("exact");
  });

  it("returns exact match first when strings match literally", () => {
    const r = rankPropertySuggestions(candidates, {
      address1: "479 Desert Holly Drive",
      city: "Palm Desert",
      state: "CA",
    });
    expect(r[0]?.id).toBe("a");
    expect(r[0]?.matchKind).toBe("exact");
  });

  it("returns partial contains matches after exact", () => {
    const r = rankPropertySuggestions(candidates, {
      address1: "479 Desert Holly",
      city: "Palm Desert",
      state: "CA",
    });
    const kinds = r.map((x) => x.matchKind);
    expect(kinds.filter((k) => k === "exact").length).toBe(0);
    expect(r.map((x) => x.id)).toContain("c");
    expect(r.map((x) => x.id)).toContain("a");
  });

  it("ranks partial_zip ahead of partial when parsed ZIP aligns", () => {
    const wrongZipPartial = {
      id: "wrongzip",
      address1: "479 Desert Holly Way",
      city: "Palm Desert",
      state: "CA",
      zip: "90210",
    };
    const mixed = [wrongZipPartial, candidates[0]!, candidates[2]!];
    const r = rankPropertySuggestions(mixed, {
      address1: "479 Desert Holly",
      city: "Palm Desert",
      state: "CA",
      zip: "92211",
    });
    const idxZip = r.findIndex((x) => x.id === "a");
    const idxWrong = r.findIndex((x) => x.id === "wrongzip");
    expect(idxZip).toBeGreaterThan(-1);
    expect(idxWrong).toBeGreaterThan(-1);
    expect(idxZip).toBeLessThan(idxWrong);
    expect(r[idxZip]?.matchKind).toBe("partial_zip");
    expect(r[idxWrong]?.matchKind).toBe("partial");
  });

  it("returns empty when address too short", () => {
    expect(
      rankPropertySuggestions(candidates, {
        address1: "12",
        city: "Palm Desert",
        state: "CA",
      })
    ).toEqual([]);
  });

  it("returns empty when no candidates match", () => {
    expect(
      rankPropertySuggestions(candidates, {
        address1: "999 Nowhere Lane",
        city: "Palm Desert",
        state: "CA",
      })
    ).toEqual([]);
  });
});

describe("rankShowingsByTimeProximity", () => {
  const t0 = new Date("2026-03-20T14:34:00");

  it("includes exact and near times within window", () => {
    const rows = [
      { id: "far", scheduledAt: new Date("2026-03-20T20:00:00"), propertyId: "p1", property: sampleProp },
      { id: "exact", scheduledAt: new Date("2026-03-20T14:34:00"), propertyId: "p1", property: sampleProp },
      { id: "near", scheduledAt: new Date("2026-03-20T15:00:00"), propertyId: "p1", property: sampleProp },
    ];
    const windowMs = 3 * 60 * 60 * 1000;
    const r = rankShowingsByTimeProximity(rows, t0, windowMs);
    expect(r.map((x) => x.id)).toEqual(["exact", "near"]);
    expect(r[0]?.minutesDelta).toBe(0);
    expect(r[0]?.propertyId).toBe("p1");
  });

  it("excludes showings outside window", () => {
    const rows = [{ id: "far", scheduledAt: new Date("2026-03-20T20:00:00"), propertyId: "p1", property: sampleProp }];
    const windowMs = 2 * 60 * 60 * 1000;
    expect(rankShowingsByTimeProximity(rows, t0, windowMs)).toEqual([]);
  });

  it("sorts by proximity", () => {
    const rows = [
      { id: "b", scheduledAt: new Date("2026-03-20T14:50:00"), propertyId: "p1", property: sampleProp },
      { id: "a", scheduledAt: new Date("2026-03-20T14:35:00"), propertyId: "p1", property: sampleProp },
    ];
    const r = rankShowingsByTimeProximity(rows, t0, 60 * 60 * 1000);
    expect(r.map((x) => x.id)).toEqual(["a", "b"]);
  });
});
