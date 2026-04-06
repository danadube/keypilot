/**
 * @jest-environment node
 */
import { ContactStatus } from "@prisma/client";
import { aggregateFarmAreaHealth, type MembershipHealthRow } from "@/lib/farm/aggregate-farm-area-health";

function baseContact(
  overrides: Partial<MembershipHealthRow["contact"]> = {}
): MembershipHealthRow["contact"] {
  return {
    id: "c1",
    firstName: "A",
    lastName: "B",
    email: null,
    email2: null,
    email3: null,
    email4: null,
    phone: null,
    phone2: null,
    mailingStreet1: null,
    mailingStreet2: null,
    mailingCity: null,
    mailingState: null,
    mailingZip: null,
    siteStreet1: null,
    siteCity: null,
    siteState: null,
    siteZip: null,
    status: ContactStatus.LEAD,
    ...overrides,
  };
}

describe("aggregateFarmAreaHealth", () => {
  it("aggregates per farm area with percentages and missing counts", () => {
    const rows: MembershipHealthRow[] = [
      {
        farmAreaId: "area-1",
        contact: baseContact({
          id: "1",
          email: "a@x.com",
          phone: "555",
          mailingStreet1: "1 Main",
          mailingCity: "Austin",
          mailingState: "TX",
          mailingZip: "78701",
          siteStreet1: "2 Oak",
          siteCity: "Austin",
          siteState: "TX",
          siteZip: "78702",
        }),
      },
      {
        farmAreaId: "area-1",
        contact: baseContact({
          id: "2",
          email2: "b@x.com",
          status: ContactStatus.FARM,
        }),
      },
    ];
    const map = aggregateFarmAreaHealth(rows);
    const m = map.get("area-1");
    expect(m).toBeDefined();
    expect(m!.totalContacts).toBe(2);
    expect(m!.withEmail).toBe(2);
    expect(m!.withPhone).toBe(1);
    expect(m!.missingPhone).toBe(1);
    expect(m!.pctWithEmail).toBe(100);
    expect(m!.pctWithPhone).toBe(50);
    expect(m!.farmStageReadyToPromote).toBe(1);
  });

  it("counts FARM contact with phone only as ready to promote", () => {
    const map = aggregateFarmAreaHealth([
      {
        farmAreaId: "a",
        contact: baseContact({
          id: "x",
          status: ContactStatus.FARM,
          phone: "214",
          email: null,
        }),
      },
    ]);
    expect(map.get("a")!.farmStageReadyToPromote).toBe(1);
  });

  it("does not count FARM without email or phone as ready", () => {
    const map = aggregateFarmAreaHealth([
      {
        farmAreaId: "a",
        contact: baseContact({ id: "x", status: ContactStatus.FARM }),
      },
    ]);
    expect(map.get("a")!.farmStageReadyToPromote).toBe(0);
  });
});
