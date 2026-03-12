import { VisitorSignInSchema } from "../visitor";

describe("VisitorSignInSchema", () => {
  const validBase = {
    openHouseId: "550e8400-e29b-41d4-a716-446655440000",
    firstName: "Jane",
    lastName: "Doe",
    signInMethod: "QR" as const,
  };

  it("accepts valid input with email", () => {
    const result = VisitorSignInSchema.safeParse({
      ...validBase,
      email: "jane@example.com",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid input with phone", () => {
    const result = VisitorSignInSchema.safeParse({
      ...validBase,
      phone: "555-123-4567",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid input with both email and phone", () => {
    const result = VisitorSignInSchema.safeParse({
      ...validBase,
      email: "jane@example.com",
      phone: "555-123-4567",
    });
    expect(result.success).toBe(true);
  });

  it("rejects when neither email nor phone provided", () => {
    const result = VisitorSignInSchema.safeParse(validBase);
    expect(result.success).toBe(false);
  });

  it("rejects when email is empty string and no phone", () => {
    const result = VisitorSignInSchema.safeParse({
      ...validBase,
      email: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid UUID for openHouseId", () => {
    const result = VisitorSignInSchema.safeParse({
      ...validBase,
      openHouseId: "not-a-uuid",
      email: "jane@example.com",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty firstName", () => {
    const result = VisitorSignInSchema.safeParse({
      ...validBase,
      firstName: "",
      email: "jane@example.com",
    });
    expect(result.success).toBe(false);
  });

  it("accepts TABLET and MANUAL signInMethod", () => {
    expect(VisitorSignInSchema.safeParse({ ...validBase, email: "j@x.com", signInMethod: "TABLET" }).success).toBe(true);
    expect(VisitorSignInSchema.safeParse({ ...validBase, email: "j@x.com", signInMethod: "MANUAL" }).success).toBe(true);
  });
});
