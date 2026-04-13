import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { apiErrorFromCaught } from "@/lib/api-response";
import { getCommandCenterPayload } from "@/lib/dashboard/command-center-payload";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    const payload = await getCommandCenterPayload(user);
    return NextResponse.json({ data: payload });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}
