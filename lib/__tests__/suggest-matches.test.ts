import {
  normalizeAddressLine,
  rankPropertySuggestions,
  rankShowingsByTimeProximity,
} from "@/lib/showing-hq/suggest-matches";

describe("normalizeAddressLine", () => {
  it("lowercases and collapses whitespace", () => {
    expect(normalizeAddressLine("  479 Desert Holly Dr.  ")).toBe("479 desert holly dr");
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

  it("returns exact match first", () => {
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
      { id: "far", scheduledAt: new Date("2026-03-20T20:00:00") },
      { id: "exact", scheduledAt: new Date("2026-03-20T14:34:00") },
      { id: "near", scheduledAt: new Date("2026-03-20T15:00:00") },
    ];
    const windowMs = 3 * 60 * 60 * 1000;
    const r = rankShowingsByTimeProximity(rows, t0, windowMs);
    expect(r.map((x) => x.id)).toEqual(["exact", "near"]);
    expect(r[0]?.minutesDelta).toBe(0);
  });

  it("excludes showings outside window", () => {
    const rows = [{ id: "far", scheduledAt: new Date("2026-03-20T20:00:00") }];
    const windowMs = 2 * 60 * 60 * 1000;
    expect(rankShowingsByTimeProximity(rows, t0, windowMs)).toEqual([]);
  });

  it("sorts by proximity", () => {
    const rows = [
      { id: "b", scheduledAt: new Date("2026-03-20T14:50:00") },
      { id: "a", scheduledAt: new Date("2026-03-20T14:35:00") },
    ];
    const r = rankShowingsByTimeProximity(rows, t0, 60 * 60 * 1000);
    expect(r.map((x) => x.id)).toEqual(["a", "b"]);
  });
});
