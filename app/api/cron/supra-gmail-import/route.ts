/**
 * Scheduled Supra Gmail import — invoked by Vercel Cron or an external scheduler with CRON_SECRET.
 * Not a user session: iterates eligible users and runs the same importer as POST import-gmail.
 */

import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/showing-hq/cron-auth";
import {
  listUserIdsForScheduledSupraGmailImport,
  runSupraGmailImportForUser,
} from "@/lib/showing-hq/supra-gmail-import-run";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json(
      { error: { message: "Unauthorized", code: "CRON_UNAUTHORIZED" } },
      { status: 401 }
    );
  }

  const userIds = await listUserIdsForScheduledSupraGmailImport();
  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  const errors: { userId: string; message: string }[] = [];

  for (const userId of userIds) {
    processed += 1;
    const result = await runSupraGmailImportForUser(userId, {
      source: "scheduled",
      respectAutomationDisabled: true,
    });
    if (result.ok && !result.skipped) {
      succeeded += 1;
    } else if (!result.ok && !result.skipped) {
      failed += 1;
      errors.push({ userId, message: result.error });
    } else if (result.skipped && result.reason === "automation_disabled") {
      /* not counted as failure */
    } else if (result.skipped && result.reason === "no_gmail_connection") {
      /* should not happen for listUserIds - skip */
    }
  }

  return NextResponse.json({
    data: {
      eligibleUsers: userIds.length,
      processed,
      succeeded,
      failed,
      errors: errors.slice(0, 20),
    },
  });
}
