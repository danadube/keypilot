import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { hasModuleAccess, type ModuleAccessMap } from "@/lib/module-access";
import { withRLSContextOrFallbackAdmin } from "@/lib/db-context";
import { apiErrorFromCaught } from "@/lib/api-response";
import { ensureValidGoogleOAuth2Client } from "@/lib/oauth/google-connection-auth";
import type { FarmImportRawRow } from "@/lib/farm/import/types";

export const dynamic = "force-dynamic";

const FetchGoogleSheetBodySchema = z.object({
  spreadsheetId: z.string().min(1, "Spreadsheet ID is required"),
  range: z.string().min(1, "Range is required"),
});

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
    const body = FetchGoogleSheetBodySchema.parse(await req.json());

    const connection = await withRLSContextOrFallbackAdmin(
      user.id,
      "farm-imports:google-sheets:fetch",
      (tx) =>
        tx.connection.findFirst({
          where: {
            userId: user.id,
            provider: "GOOGLE",
            status: "CONNECTED",
            accessToken: { not: null },
            service: { in: ["GOOGLE_CALENDAR", "GMAIL"] },
          },
          orderBy: [{ updatedAt: "desc" }],
        })
    );
    if (!connection?.accessToken) {
      return NextResponse.json(
        {
          error: {
            message:
              "Connect Google first in Settings > Connections, then retry Google Sheets import.",
          },
        },
        { status: 400 }
      );
    }

    const auth = await ensureValidGoogleOAuth2Client({
      id: connection.id,
      accessToken: connection.accessToken,
      refreshToken: connection.refreshToken,
      tokenExpiresAt: connection.tokenExpiresAt,
    });
    const sheets = google.sheets({ version: "v4", auth });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: body.spreadsheetId,
      range: body.range,
      majorDimension: "ROWS",
    });
    const values = response.data.values ?? [];
    if (values.length === 0) {
      return NextResponse.json({ data: { headers: [], rows: [], rowCount: 0 } });
    }

    const headers = values[0]
      .map((cell) => String(cell ?? "").trim())
      .filter((header) => header.length > 0);
    const rows: FarmImportRawRow[] = [];
    for (let i = 1; i < values.length; i += 1) {
      const rowValues = values[i] ?? [];
      const row: FarmImportRawRow = {};
      let hasAny = false;
      for (let c = 0; c < headers.length; c += 1) {
        const value = String(rowValues[c] ?? "").trim();
        if (value.length > 0) hasAny = true;
        row[headers[c]] = value;
      }
      if (hasAny) rows.push(row);
    }

    return NextResponse.json({
      data: {
        headers,
        rows: rows.slice(0, 1000),
        rowCount: rows.length,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("insufficient authentication scopes")) {
      return NextResponse.json(
        {
          error: {
            message:
              "Google connection is missing Sheets read scope. Reconnect Google in Settings and retry.",
          },
        },
        { status: 400 }
      );
    }
    return apiErrorFromCaught(error);
  }
}
