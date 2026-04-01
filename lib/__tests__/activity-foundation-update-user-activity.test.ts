import { updateUserActivity } from "@/lib/activity-foundation";
import type { ActivityTx } from "@/lib/activity-foundation";

function mockTxForUpdate(overrides: {
  propertyRow?: { address1: string; city: string; state: string; zip: string } | null;
  contactRow?: { firstName: string; lastName: string; email: string | null } | null;
  owned: {
    id: string;
    userId: string;
    propertyId: string | null;
    contactId: string | null;
    title: string;
    description: string | null;
  };
}): ActivityTx & {
  __updateData: { data?: Record<string, unknown> };
  __findFirst: jest.Mock;
} {
  const updateData: { data?: Record<string, unknown> } = {};
  const propertyFindFirst = jest.fn(async () => overrides.propertyRow ?? null);
  const contactFindFirst = jest.fn(async () => overrides.contactRow ?? null);

  const findFirst = jest.fn(async () => overrides.owned);

  const update = jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
    updateData.data = data;
    return { ...overrides.owned, ...data };
  });

  return {
    property: { findFirst: propertyFindFirst },
    contact: { findFirst: contactFindFirst },
    userActivity: { findFirst, update },
    activityLog: { create: jest.fn(async () => ({})) },
    __updateData: updateData,
    __findFirst: findFirst,
  } as unknown as ActivityTx & {
    __updateData: typeof updateData;
    __findFirst: jest.Mock;
  };
}

describe("updateUserActivity — PATCH placeholder substitution (explicit fields only)", () => {
  it("resolves title placeholders using effective merged property/contact from patch + existing row", async () => {
    const tx = mockTxForUpdate({
      propertyRow: {
        address1: "1 Main St",
        city: "Austin",
        state: "TX",
        zip: "78701",
      },
      contactRow: { firstName: "Pat", lastName: "Lee", email: "p@example.com" },
      owned: {
        id: "act-1",
        userId: "user-1",
        propertyId: "prop-1",
        contactId: null,
        title: "Old",
        description: null,
      },
    });
    const ext = tx as ActivityTx & { __updateData: { data?: Record<string, unknown> } };

    await updateUserActivity(tx, {
      id: "act-1",
      userId: "user-1",
      patch: {
        title: "{{property.city}} / {{contact.lastName}}",
        contactId: "c-1",
      },
    });

    expect(ext.__updateData.data?.title).toBe("Austin / Lee");
  });

  it("uses patched propertyId in effective context when title and propertyId are sent together", async () => {
    const tx = mockTxForUpdate({
      propertyRow: {
        address1: "y",
        city: "NewCity",
        state: "FL",
        zip: "2",
      },
      contactRow: null,
      owned: {
        id: "act-1",
        userId: "user-1",
        propertyId: "prop-old",
        contactId: null,
        title: "Old",
        description: null,
      },
    });

    const ext = tx as ActivityTx & { __updateData: { data?: Record<string, unknown> } };

    await updateUserActivity(tx, {
      id: "act-1",
      userId: "user-1",
      patch: {
        propertyId: "prop-new",
        title: "{{property.city}}, {{property.state}}",
      },
    });

    expect(ext.__updateData.data?.title).toBe("NewCity, FL");
    expect(
      (ext.__updateData.data as { property?: { connect: { id: string } } })?.property?.connect
        ?.id
    ).toBe("prop-new");
  });

  it("substitutes description when included and non-null", async () => {
    const tx = mockTxForUpdate({
      propertyRow: {
        address1: "1 Main St",
        city: "Austin",
        state: "TX",
        zip: "78701",
      },
      contactRow: null,
      owned: {
        id: "act-1",
        userId: "user-1",
        propertyId: "prop-1",
        contactId: null,
        title: "T",
        description: "prev",
      },
    });
    const ext = tx as ActivityTx & { __updateData: { data?: Record<string, unknown> } };

    await updateUserActivity(tx, {
      id: "act-1",
      userId: "user-1",
      patch: { description: "Addr {{property.address1}}" },
    });

    expect(ext.__updateData.data?.description).toBe("Addr 1 Main St");
  });

  it("throws 400 when title resolves empty after placeholders", async () => {
    const tx = mockTxForUpdate({
      contactRow: null,
      propertyRow: null,
      owned: {
        id: "act-1",
        userId: "user-1",
        propertyId: null,
        contactId: null,
        title: "Old",
        description: null,
      },
    });

    await expect(
      updateUserActivity(tx, {
        id: "act-1",
        userId: "user-1",
        patch: { title: "{{contact.firstName}}" },
      })
    ).rejects.toMatchObject({
      status: 400,
      message: "Title is empty after resolving placeholders",
    });
  });

  it("does not rewrite title or description on link-only patch", async () => {
    const update = jest.fn(async () => ({}));
    const tx = {
      property: { findFirst: jest.fn(async () => null) },
      contact: { findFirst: jest.fn(async () => ({ id: "c-new" })) },
      userActivity: {
        findFirst: jest.fn(async () => ({
          id: "act-1",
          userId: "user-1",
          propertyId: "prop-1",
          contactId: null,
          title: "Seeded title",
          description: "Notes here",
        })),
        update,
      },
      activityLog: { create: jest.fn(async () => ({})) },
    } as unknown as ActivityTx;

    await updateUserActivity(tx, {
      id: "act-1",
      userId: "user-1",
      patch: { contactId: "c-new" },
    });

    const callData = ((update.mock.calls as unknown as unknown[][])[0][0] as { data: Record<string, unknown> }).data;
    expect(callData.title).toBeUndefined();
    expect(callData.description).toBeUndefined();
  });
});
