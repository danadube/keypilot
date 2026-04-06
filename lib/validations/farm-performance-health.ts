import { z } from "zod";
import { FarmStructureVisibilitySchema } from "@/lib/validations/farm-structure-visibility";

export const FarmPerformanceHealthQuerySchema = z
  .object({
    visibility: FarmStructureVisibilitySchema.optional().default("active"),
  })
  .strict();

export type FarmPerformanceHealthQuery = z.infer<typeof FarmPerformanceHealthQuerySchema>;
