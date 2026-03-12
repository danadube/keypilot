import { CreatePropertySchema, UpdatePropertySchema } from "../property";

describe("CreatePropertySchema", () => {
  const valid = {
    address1: "123 Main St",
    city: "Austin",
    state: "TX",
    zip: "78701",
  };

  it("accepts minimal valid input", () => {
    const result = CreatePropertySchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("accepts full input with optional fields", () => {
    const result = CreatePropertySchema.safeParse({
      ...valid,
      mlsNumber: "12345678",
      address2: "Apt 4",
      listingPrice: 495000,
      notes: "Corner lot",
    });
    expect(result.success).toBe(true);
  });

  it("accepts mlsNumber", () => {
    const result = CreatePropertySchema.safeParse({ ...valid, mlsNumber: "MLS-12345" });
    expect(result.success).toBe(true);
  });

  it("rejects empty address1", () => {
    const result = CreatePropertySchema.safeParse({ ...valid, address1: "" });
    expect(result.success).toBe(false);
  });

  it("rejects missing required fields", () => {
    expect(CreatePropertySchema.safeParse({ address1: "123", city: "Austin" }).success).toBe(false);
    expect(CreatePropertySchema.safeParse({ ...valid, city: "" }).success).toBe(false);
    expect(CreatePropertySchema.safeParse({ ...valid, state: "" }).success).toBe(false);
    expect(CreatePropertySchema.safeParse({ ...valid, zip: "" }).success).toBe(false);
  });

  it("rejects invalid listingPrice", () => {
    const result = CreatePropertySchema.safeParse({
      ...valid,
      listingPrice: -100,
    });
    expect(result.success).toBe(false);
  });
});

describe("UpdatePropertySchema", () => {
  it("accepts partial updates", () => {
    const result = UpdatePropertySchema.safeParse({ address1: "456 Oak Ave" });
    expect(result.success).toBe(true);
  });

  it("accepts empty object", () => {
    const result = UpdatePropertySchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("rejects empty string for address1 when provided", () => {
    const result = UpdatePropertySchema.safeParse({ address1: "" });
    expect(result.success).toBe(false);
  });
});
