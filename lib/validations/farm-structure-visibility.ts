import { z } from "zod";

export const FarmStructureVisibilitySchema = z.enum(["active", "archived", "all"]);

export type FarmStructureVisibility = z.infer<typeof FarmStructureVisibilitySchema>;

export function parseFarmStructureVisibility(
  raw: string | null | undefined
): FarmStructureVisibility {
  const parsed = FarmStructureVisibilitySchema.safeParse(raw ?? "active");
  return parsed.success ? parsed.data : "active";
}
