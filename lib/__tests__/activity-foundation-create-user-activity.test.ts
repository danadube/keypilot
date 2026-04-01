import { createUserActivity } from "@/lib/activity-foundation";
import type { ActivityTx } from "@/lib/activity-foundation";

function mockTx(overrides: {
  propertyRow?: { address1: string; city: string; state: string; zip: string } | null;
  contactRow?: { firstName: string; lastName: string; email: string | null } | null;
}): ActivityTx {
  const propertyFindFirst = jest.fn(async () => overrides.propertyRow ?? null);
  const contactFindFirst = jest.fn(async () => overrides.contactRow ?? null);
  const captured: { data?: Record<string, unknown> } = {};
  return {
    property: { findFirst: propertyFindFirst },
    contact: { findFirst: contactFindFirst },
    userActivity: {
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        captured.data = data;
        return { id: "new-id", ...data };
      }),
    },
    activityLog: { create: jest.fn(async () => ({})) },
    __captured: captured,
    __propertyFindFirst: propertyFindFirst,
    __contactFindFirst: contactFindFirst,
  } as unknown as ActivityTx & {
    __captured: typeof captured;
    __propertyFindFirst: jest.Mock;
    __contactFindFirst: jest.Mock;
  };
}

describe("createUserActivity — server-side placeholder substitution", () => {
  it("resolves whitelisted tokens using linked property and contact rows", async () => {
    const tx = mockTx({
      propertyRow: {
        address1: "1 Main St",
        city: "Austin",
        state: "TX",
        zip: "78701",
      },
      contactRow: { firstName: "Pat", lastName: "Lee", email: "p@example.com" },
    });
    const ext = tx as ActivityTx & {
      __captured: { data?: Record<string, unknown> };
      __propertyFindFirst: jest.Mock;
      __contactFindFirst: jest.Mock;
    };

    await createUserActivity(tx, {
      userId: "user-1",
      type: "CALL",
      title: "Hi {{contact.firstName}} — {{property.city}}, {{property.state}}",
      description: "{{contact.email}} / {{property.address1}}",
      propertyId: "prop-1",
      contactId: "contact-1",
    });

    expect(ext.__propertyFindFirst).toHaveBeenCalled();
    expect(ext.__contactFindFirst).toHaveBeenCalled();
    expect(ext.__captured.data?.title).toBe("Hi Pat — Austin, TX");
    expect(ext.__captured.data?.description).toBe("p@example.com / 1 Main St");
  });

  it("replaces known tokens with empty string when links are missing", async () => {
    const tx = mockTx({});
    const ext = tx as ActivityTx & { __captured: { data?: Record<string, unknown> } };

    await createUserActivity(tx, {
      userId: "user-1",
      type: "TASK",
      title: "x{{contact.firstName}}y{{property.city}}z",
    });

    expect(ext.__captured.data?.title).toBe("xyz");
  });

  it("leaves literal titles unchanged (no substitution when no tokens)", async () => {
    const tx = mockTx({
      propertyRow: {
        address1: "1 Main St",
        city: "Austin",
        state: "TX",
        zip: "78701",
      },
      contactRow: { firstName: "Pat", lastName: "Lee", email: null },
    });
    const ext = tx as ActivityTx & {
      __captured: { data?: Record<string, unknown> };
      __propertyFindFirst: jest.Mock;
      __contactFindFirst: jest.Mock;
    };

    await createUserActivity(tx, {
      userId: "user-1",
      type: "NOTE",
      title: "Plain title no tokens",
      propertyId: "prop-1",
      contactId: "contact-1",
    });

    expect(ext.__captured.data?.title).toBe("Plain title no tokens");
  });

  it("throws 400 when substitution yields an empty title", async () => {
    const tx = mockTx({});
    await expect(
      createUserActivity(tx, {
        userId: "user-1",
        type: "TASK",
        title: "{{contact.firstName}}",
      })
    ).rejects.toMatchObject({
      status: 400,
      message: "Title is empty after resolving placeholders",
    });
  });

  it("throws 404 when propertyId is set but not visible in tx", async () => {
    const tx = mockTx({ propertyRow: null });
    await expect(
      createUserActivity(tx, {
        userId: "user-1",
        type: "CALL",
        title: "t",
        propertyId: "missing-prop",
      })
    ).rejects.toMatchObject({ status: 404 });
  });
});
