import { zonedDayBoundsContaining } from "@/lib/datetime/zoned-day-bounds";

describe("zonedDayBoundsContaining", () => {
  it("returns a 20–28h span for America/Los_Angeles (DST-safe range)", () => {
    const utc = new Date("2026-07-15T18:00:00.000Z");
    const { start, end } = zonedDayBoundsContaining(utc, "America/Los_Angeles");
    const hours = (end.getTime() - start.getTime()) / (60 * 60 * 1000);
    expect(hours).toBeGreaterThanOrEqual(20);
    expect(hours).toBeLessThanOrEqual(28);
    expect(start.getTime()).toBeLessThan(end.getTime());
    expect(utc.getTime()).toBeGreaterThanOrEqual(start.getTime());
    expect(utc.getTime()).toBeLessThan(end.getTime());
  });
});
