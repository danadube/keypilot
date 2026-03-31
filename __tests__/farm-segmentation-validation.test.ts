import {
  CreateContactFarmMembershipSchema,
  CreateFarmAreaSchema,
  CreateFarmTerritorySchema,
} from "@/lib/validations/farm-segmentation";

describe("farm segmentation Zod", () => {
  it("CreateFarmTerritorySchema requires non-empty name", () => {
    expect(CreateFarmTerritorySchema.safeParse({ name: "" }).success).toBe(false);
    expect(CreateFarmTerritorySchema.safeParse({ name: "North" }).success).toBe(true);
  });

  it("CreateFarmAreaSchema requires non-empty name", () => {
    expect(CreateFarmAreaSchema.safeParse({ name: "" }).success).toBe(false);
    expect(CreateFarmAreaSchema.safeParse({ name: "Oak Hills" }).success).toBe(true);
  });

  it("CreateContactFarmMembershipSchema requires UUIDs", () => {
    expect(
      CreateContactFarmMembershipSchema.safeParse({
        contactId: "not-a-uuid",
        farmAreaId: "550e8400-e29b-41d4-a716-446655440000",
      }).success
    ).toBe(false);
    expect(
      CreateContactFarmMembershipSchema.safeParse({
        contactId: "550e8400-e29b-41d4-a716-446655440000",
        farmAreaId: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      }).success
    ).toBe(true);
  });
});
