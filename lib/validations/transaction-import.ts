import { z } from "zod";

export const MoneySchema = z.number().finite().nonnegative();

export const DateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");

export const ExtractedPartySchema = z
  .object({
    raw: z.string().min(1),
    normalized: z.string().min(1).optional(),
  })
  .strict();

export const ExtractedCommissionLineSchema = z
  .object({
    label: z.string().min(1),
    amount: MoneySchema,
    category: z.enum([
      "GCI",
      "BROKER_FEE",
      "DEDUCTION",
      "REFERRAL",
      "NET",
      "OTHER",
    ]),
    confidence: z.number().min(0).max(1),
  })
  .strict();

export const ParsedCommissionStatementSchema = z
  .object({
    source: z
      .object({
        fileName: z.string().min(1),
        mimeType: z.literal("application/pdf"),
        pageCount: z.number().int().positive(),
        parserVersion: z.string().min(1),
        detectedBrokerage: z.string().min(1).nullable().optional(),
        parserProfile: z.string().min(1).optional(),
        parserProfileVersion: z.string().min(1).optional(),
      })
      .strict(),
    extracted: z
      .object({
        propertyAddress: z.string().min(1).optional(),
        transactionType: z
          .enum(["SALE", "LEASE", "REFERRAL_IN", "REFERRAL_OUT", "UNKNOWN"])
          .default("UNKNOWN"),
        contractDate: DateStringSchema.optional(),
        closeDate: DateStringSchema.optional(),
        expirationDate: DateStringSchema.optional(),
        buyers: z.array(ExtractedPartySchema).default([]),
        sellers: z.array(ExtractedPartySchema).default([]),
        salePrice: MoneySchema.optional(),
        grossCommission: MoneySchema.optional(),
        brokerageFeesTotal: MoneySchema.optional(),
        deductionsTotal: MoneySchema.optional(),
        netToAgent: MoneySchema.optional(),
        transactionExternalId: z.string().min(1).optional(),
        brokerageName: z.string().min(1).optional(),
        officeName: z.string().min(1).optional(),
        lineItems: z.array(ExtractedCommissionLineSchema).default([]),
      })
      .strict(),
    scoring: z
      .object({
        overallConfidence: z.number().min(0).max(1),
        fieldConfidence: z.record(z.string(), z.number().min(0).max(1)),
        warnings: z.array(z.string()),
        missingRequired: z.array(z.string()),
      })
      .strict(),
  })
  .strict();

export type ParsedCommissionStatement = z.infer<
  typeof ParsedCommissionStatementSchema
>;
