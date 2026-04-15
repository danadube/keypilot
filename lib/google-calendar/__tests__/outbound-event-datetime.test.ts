import {
  addOneGregorianDayYmd,
  formatDateKeyInTimeZone,
  formatInstantForGoogleCalendarDateTime,
} from "../outbound-event-datetime";

describe("formatInstantForGoogleCalendarDateTime", () => {
  it("formats wall time in America/Los_Angeles without Z offset (PDT)", () => {
    const instant = new Date("2026-06-16T05:00:00.000Z");
    const s = formatInstantForGoogleCalendarDateTime(instant, "America/Los_Angeles");
    expect(s).toBe("2026-06-15T22:00:00");
  });

  it("keeps 7:30 AM as morning in LA (PST)", () => {
    const instant = new Date("2026-01-15T15:30:00.000Z");
    const s = formatInstantForGoogleCalendarDateTime(instant, "America/Los_Angeles");
    expect(s).toBe("2026-01-15T07:30:00");
  });

  it("falls back for invalid IANA to America/Los_Angeles", () => {
    const instant = new Date("2026-01-15T15:30:00.000Z");
    const s = formatInstantForGoogleCalendarDateTime(instant, "Not/A_Zone");
    expect(s).toMatch(/^2026-01-15T07:30:00$/);
  });
});

describe("formatDateKeyInTimeZone", () => {
  it("uses the user calendar date, not UTC date, near midnight", () => {
    const instant = new Date("2026-06-16T07:00:00.000Z");
    const key = formatDateKeyInTimeZone(instant, "America/Los_Angeles");
    expect(key).toBe("2026-06-16");
  });
});

describe("addOneGregorianDayYmd", () => {
  it("advances YYYY-MM-DD by one calendar day", () => {
    expect(addOneGregorianDayYmd("2026-03-31")).toBe("2026-04-01");
  });
});
