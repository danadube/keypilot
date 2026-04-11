import { CreateContactSchema } from "@/lib/validations/contact";

describe("CreateContactSchema", () => {
  it("rejects empty first name", () => {
    const bad = CreateContactSchema.safeParse({
      firstName: "",
      lastName: "B",
      email: null,
      phone: null,
    });
    expect(bad.success).toBe(false);
  });

  it("accepts email only", () => {
    const ok = CreateContactSchema.safeParse({
      firstName: "A",
      lastName: "B",
      email: "a@b.co",
      phone: null,
    });
    expect(ok.success).toBe(true);
  });

  it("accepts minimal names with null email and phone (dedupe on server)", () => {
    const ok = CreateContactSchema.safeParse({
      firstName: "A",
      lastName: "B",
      email: null,
      phone: null,
    });
    expect(ok.success).toBe(true);
  });
});
