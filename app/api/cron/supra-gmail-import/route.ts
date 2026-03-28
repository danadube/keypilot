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

const CRON_LOG = "[cron/supra-gmail-import]";

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json(
      { error: { message: "Unauthorized", code: "CRON_UNAUTHORIZED" } },
      { status: 401 }
    );
  }

  const userIds = await listUserIdsForScheduledSupraGmailImport();
  console.log(`${CRON_LOG} start eligibleUsers=${userIds.length}`);

  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  let skippedBusy = 0;
  const errors: { userId: string; message: string }[] = [];

  // Sequential: one user at a time to bound CPU/time and avoid Gmail/token storms.
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
    } else if (result.skipped && result.reason === "import_already_in_progress") {
      skippedBusy += 1;
    } else if (result.skipped && result.reason === "automation_disabled") {
      /* not counted as failure */
    } else if (result.skipped && result.reason === "no_gmail_connection") {
      /* should not happen for listUserIds - skip */
    }
  }

  console.log(
    `${CRON_LOG} done processed=${processed} succeeded=${succeeded} failed=${failed} skippedBusy=${skippedBusy}`
  );

  return NextResponse.json({
    data: {
      eligibleUsers: userIds.length,
      processed,
      succeeded,
      failed,
      skippedBusy,
      errors: errors.slice(0, 20),
    },
  });
}
