import {
  applyQuickTimePreset,
  combineLocalDateAndTimeToIso,
  localDateTimeFromParts,
  localDateTimePartsValid,
  isoToLocalDateInput,
  isoToLocalTimeInput,
} from "../local-scheduling";

describe("local-scheduling", () => {
  it("localDateTimeFromParts uses local wall time (not UTC date-only shift)", () => {
    const d = localDateTimeFromParts("2026-06-15", "14:30");
    expect(Number.isNaN(d.getTime())).toBe(false);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(5);
    expect(d.getDate()).toBe(15);
    expect(d.getHours()).toBe(14);
    expect(d.getMinutes()).toBe(30);
  });

  it("combineLocalDateAndTimeToIso round-trips with local parts helpers", () => {
    const iso = combineLocalDateAndTimeToIso("2026-03-01", "09:05");
    expect(iso).toBeTruthy();
    expect(isoToLocalDateInput(iso!)).toBe("2026-03-01");
    expect(isoToLocalTimeInput(iso!)).toBe("09:05");
  });

  it("localDateTimePartsValid rejects garbage", () => {
    expect(localDateTimePartsValid("2026-01-01", "25:99")).toBe(false);
    expect(localDateTimePartsValid("", "10:00")).toBe(false);
  });

  it("applyQuickTimePreset tomorrow10am moves to next calendar day at 10:00", () => {
    const base = { date: "2026-01-10", time: "16:00" };
    const next = applyQuickTimePreset("tomorrow10am", base);
    expect(next.date).toBe("2026-01-11");
    expect(next.time).toBe("10:00");
  });

  it("applyQuickTimePreset +30m uses current fields when valid", () => {
    const next = applyQuickTimePreset("+30m", { date: "2026-01-10", time: "10:00" });
    expect(next.time).toBe("10:30");
    expect(next.date).toBe("2026-01-10");
  });
});
