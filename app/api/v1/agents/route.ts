import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { apiErrorFromCaught } from "@/lib/api-response";

/** Returns agents for dropdown: current user (as "Me") and optionally org members. */
export async function GET() {
  try {
    const user = await getCurrentUser();
    return NextResponse.json({
      data: [{ id: "me", name: user.name, email: user.email }],
    });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}
