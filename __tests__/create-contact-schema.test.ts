import { CreateContactSchema } from "@/lib/validations/contact";

describe("CreateContactSchema", () => {
  it("requires first and last name plus email or phone", () => {
    const bad = CreateContactSchema.safeParse({
      firstName: "A",
      lastName: "B",
      email: "",
      phone: "",
    });
    expect(bad.success).toBe(false);
  });

  it("accepts email only", () => {
    const ok = CreateContactSchema.safeParse({
      firstName: "A",
      lastName: "B",
      email: "a@b.co",
      phone: "",
    });
    expect(ok.success).toBe(true);
  });

  it("accepts phone with 10+ digits", () => {
    const ok = CreateContactSchema.safeParse({
      firstName: "A",
      lastName: "B",
      email: "",
      phone: "(555) 123-4567",
    });
    expect(ok.success).toBe(true);
  });
});
