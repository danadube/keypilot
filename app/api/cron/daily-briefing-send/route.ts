/**
 * Scheduled daily briefing email — Vercel Cron or `Authorization: Bearer CRON_SECRET`.
 */

import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/showing-hq/cron-auth";
import { runDailyBriefingCron } from "@/lib/daily-briefing/run-daily-briefing-send";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const LOG = "[cron/daily-briefing-send]";

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json(
      { error: { message: "Unauthorized", code: "CRON_UNAUTHORIZED" } },
      { status: 401 }
    );
  }

  console.log(`${LOG} start`);
  const summary = await runDailyBriefingCron(new Date());
  console.log(`${LOG} done`, summary);

  return NextResponse.json({ data: summary });
}
