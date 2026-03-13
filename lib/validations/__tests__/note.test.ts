import { AddNoteSchema } from "../note";

describe("AddNoteSchema", () => {
  it("accepts valid note body", () => {
    const result = AddNoteSchema.safeParse({ body: "Called back, interested" });
    expect(result.success).toBe(true);
  });

  it("rejects empty body", () => {
    expect(AddNoteSchema.safeParse({ body: "" }).success).toBe(false);
    expect(AddNoteSchema.safeParse({ body: "   " }).success).toBe(false);
  });

  it("rejects missing body", () => {
    expect(AddNoteSchema.safeParse({}).success).toBe(false);
  });

  it("accepts body up to 5000 chars", () => {
    const long = "a".repeat(5000);
    expect(AddNoteSchema.safeParse({ body: long }).success).toBe(true);
  });

  it("rejects body over 5000 chars", () => {
    const tooLong = "a".repeat(5001);
    expect(AddNoteSchema.safeParse({ body: tooLong }).success).toBe(false);
  });
});
