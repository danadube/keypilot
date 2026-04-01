import { NextRequest, NextResponse } from "next/server";
import { TransactionImportStatus } from "@prisma/client";
import type { TextItem, TextMarkedContent } from "pdfjs-dist/types/src/display/api";
import { getCurrentUser } from "@/lib/auth";
import { withRLSContext } from "@/lib/db-context";
import { hasCrmAccess } from "@/lib/product-tier";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import { parseCommissionStatementFromPdfText } from "@/lib/transactions/commission-import-parser";
import { ParsedCommissionStatementSchema } from "@/lib/validations/transaction-import";

export const runtime = "nodejs";

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;

async function extractTextFromPdf(buffer: Buffer) {
  const pdfjs = await import("pdfjs-dist");
  const task = pdfjs.getDocument({ data: new Uint8Array(buffer) });
  const doc = await task.promise;
  const pages: string[] = [];

  for (let i = 1; i <= doc.numPages; i += 1) {
    const page = await doc.getPage(i);
    const textContent = await page.getTextContent();
    const lines = textContent.items
      .map((item: TextItem | TextMarkedContent) => ("str" in item ? item.str : ""))
      .filter((value: string) => value.length > 0);
    pages.push(lines.join(" "));
  }

  return { text: pages.join("\n"), pageCount: doc.numPages || 1 };
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!hasCrmAccess(user.productTier)) {
      return apiError("CRM features require Full CRM tier", 403);
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return apiError("A PDF file is required", 400);
    }
    if (file.type !== "application/pdf") {
      return apiError("Only PDF files are supported", 400);
    }
    if (file.size <= 0) {
      return apiError("Uploaded file is empty", 400);
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return apiError("PDF must be 15MB or smaller", 400);
    }

    const raw = Buffer.from(await file.arrayBuffer());
    const pdf = await extractTextFromPdf(raw);
    const pdfText = (pdf.text ?? "").trim();
    if (!pdfText) {
      return apiError(
        "Unable to extract text from PDF. Please upload a text-based statement.",
        422
      );
    }

    const parsed = parseCommissionStatementFromPdfText({
      pdfText,
      fileName: file.name,
      mimeType: "application/pdf",
      pageCount: pdf.pageCount || 1,
    });

    const validated = ParsedCommissionStatementSchema.parse(parsed);

    const session = await withRLSContext(user.id, (tx) =>
      tx.transactionImportSession.create({
        data: {
          userId: user.id,
          status: TransactionImportStatus.PARSED,
          fileName: file.name,
          mimeType: file.type,
          parsedPayload: validated,
          detectedBrokerage: validated.source.detectedBrokerage ?? null,
          selectedBrokerage: validated.source.detectedBrokerage ?? null,
          parserProfile:
            validated.source.parserProfile ??
            "generic",
          parserProfileVersion: validated.source.parserProfileVersion ?? "v1",
          brokerageProfile: validated.source.detectedBrokerage ?? null,
          parserVersion: validated.source.parserVersion,
          confidence: validated.scoring.overallConfidence,
          warnings: validated.scoring.warnings,
        },
        select: { id: true },
      })
    );

    return NextResponse.json({
      importSessionId: session.id,
      parsedPayload: validated,
      warnings: validated.scoring.warnings,
      missingRequired: validated.scoring.missingRequired,
    });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}
