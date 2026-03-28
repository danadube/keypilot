/**
 * Pull recent Supra-related messages from connected Gmail into the Supra review queue.
 * New messages create INGESTED rows. Existing rows (except APPLIED / DUPLICATE) get
 * `rawBodyText` + headers refreshed from Gmail so re-import picks up improved extraction.
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import { runSupraGmailImportForUser } from "@/lib/showing-hq/supra-gmail-import-run";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const user = await getCurrentUser();

    const result = await runSupraGmailImportForUser(user.id, {
      source: "manual",
      respectAutomationDisabled: false,
    });

    if (result.skipped && result.reason === "no_gmail_connection") {
      return apiError(
        "No active Gmail connection. Connect Gmail under Settings → Connections.",
        400,
        "GMAIL_NOT_CONNECTED"
      );
    }

    if (result.skipped && result.reason === "import_already_in_progress") {
      return apiError(
        result.message ??
          "An import is already running. Wait a moment and try again.",
        409,
        "IMPORT_BUSY"
      );
    }

    if (!result.ok && !result.skipped) {
      return apiError(result.error ?? "Import failed", 500, "IMPORT_FAILED");
    }

    if (!result.ok || result.skipped) {
      return apiError("Import did not complete", 500, "IMPORT_FAILED");
    }

    return NextResponse.json({
      data: {
        imported: result.imported,
        refreshed: result.refreshed,
        skipped: result.skippedMessages,
        autoParsed: result.autoParsed,
        scanned: result.scanned,
      },
    });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}
