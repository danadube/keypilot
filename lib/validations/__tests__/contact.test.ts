import { UpdateContactSchema } from "../contact";

describe("UpdateContactSchema", () => {
  it("accepts status enum values", () => {
    expect(UpdateContactSchema.safeParse({ status: "FARM" }).success).toBe(true);
    expect(UpdateContactSchema.safeParse({ status: "LEAD" }).success).toBe(true);
    expect(UpdateContactSchema.safeParse({ status: "CONTACTED" }).success).toBe(true);
    expect(UpdateContactSchema.safeParse({ status: "NURTURING" }).success).toBe(true);
    expect(UpdateContactSchema.safeParse({ status: "READY" }).success).toBe(true);
    expect(UpdateContactSchema.safeParse({ status: "LOST" }).success).toBe(true);
  });

  it("accepts null status", () => {
    expect(UpdateContactSchema.safeParse({ status: null }).success).toBe(true);
  });

  it("rejects invalid status", () => {
    expect(UpdateContactSchema.safeParse({ status: "INVALID" }).success).toBe(false);
  });

  it("accepts assignedToUserId as valid UUID", () => {
    const result = UpdateContactSchema.safeParse({
      assignedToUserId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid assignedToUserId", () => {
    expect(UpdateContactSchema.safeParse({ assignedToUserId: "not-uuid" }).success).toBe(false);
  });
});
