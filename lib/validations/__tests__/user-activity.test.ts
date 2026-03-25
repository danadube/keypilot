import {
  CompleteUserActivityBodySchema,
  CreateActivityTemplateBodySchema,
  CreateUserActivityBodySchema,
  UpdateActivityTemplateSchema,
  UpdateUserActivitySchema,
} from "@/lib/validations/user-activity";

describe("user-activity validation", () => {
  describe("CreateUserActivityBodySchema", () => {
    it("accepts a minimal body without userId", () => {
      const r = CreateUserActivityBodySchema.safeParse({
        type: "CALL",
        title: "Follow up",
      });
      expect(r.success).toBe(true);
    });

    it("rejects extra keys (strict)", () => {
      const r = CreateUserActivityBodySchema.safeParse({
        type: "NOTE",
        title: "x",
        userId: "550e8400-e29b-41d4-a716-446655440000",
      });
      expect(r.success).toBe(false);
    });

    it("optional propertyId contactId", () => {
      const r = CreateUserActivityBodySchema.safeParse({
        type: "TASK",
        title: "t",
        propertyId: "550e8400-e29b-41d4-a716-446655440001",
        contactId: null,
      });
      expect(r.success).toBe(true);
    });
  });

  describe("CreateActivityTemplateBodySchema", () => {
    it("accepts template body", () => {
      const r = CreateActivityTemplateBodySchema.safeParse({
        name: "After showing",
        type: "FOLLOW_UP",
        titleTemplate: "Hi {{name}}",
        offsetDays: 3,
      });
      expect(r.success).toBe(true);
    });
  });

  describe("UpdateUserActivitySchema", () => {
    it("allows partial patch", () => {
      const r = UpdateUserActivitySchema.safeParse({ title: "New" });
      expect(r.success).toBe(true);
    });

    it("rejects unknown keys", () => {
      const r = UpdateUserActivitySchema.safeParse({
        title: "x",
        userId: "550e8400-e29b-41d4-a716-446655440000",
      });
      expect(r.success).toBe(false);
    });
  });

  describe("UpdateActivityTemplateSchema", () => {
    it("allows partial", () => {
      expect(UpdateActivityTemplateSchema.safeParse({ name: "n" }).success).toBe(
        true
      );
    });
  });

  describe("CompleteUserActivityBodySchema", () => {
    it("allows empty object", () => {
      expect(CompleteUserActivityBodySchema.safeParse({}).success).toBe(true);
    });
  });
});
