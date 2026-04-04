import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import { hasModuleAccess, type ModuleAccessMap } from "@/lib/module-access";
import { ParseXlsxError, parseXlsxBuffer } from "@/lib/farm/import/xlsx";

export const dynamic = "force-dynamic";

const FARM_IMPORT_MAX_ROWS = 1000;
const MAX_XLSX_BYTES = 12 * 1024 * 1024;
const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function isAllowedXlsxUpload(file: File): boolean {
  if (file.name.toLowerCase().endsWith(".xlsx")) return true;
  const mime = (file.type ?? "").split(";")[0]?.trim().toLowerCase() ?? "";
  return mime === XLSX_MIME;
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const accessMap = user.moduleAccess as ModuleAccessMap | null | undefined;
    if (!hasModuleAccess(accessMap, "farm-trackr")) {
      return NextResponse.json(
        { error: { message: "Farm imports require CRM access." } },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return apiError("Choose an Excel file (.xlsx) to import.", 400);
    }

    if (!isAllowedXlsxUpload(file)) {
      return apiError("Only .xlsx Excel workbooks are supported for this import.", 400);
    }

    if (file.size > MAX_XLSX_BYTES) {
      return apiError("Excel file is too large. Maximum size is 12 MB.", 400);
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const parsed = parseXlsxBuffer(buffer);

    return NextResponse.json({
      data: {
        headers: parsed.headers,
        rows: parsed.rows.slice(0, FARM_IMPORT_MAX_ROWS),
        rowCount: parsed.rows.length,
      },
    });
  } catch (error) {
    if (error instanceof ParseXlsxError) {
      return apiError(error.message, 400);
    }
    return apiErrorFromCaught(error);
  }
}
