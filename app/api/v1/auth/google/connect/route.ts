import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getGoogleOAuth2Client, getScopesForService } from "@/lib/oauth/google";

export const dynamic = "force-dynamic";

const ALLOWED_SERVICES = ["google_calendar", "gmail"] as const;

/** GET /api/v1/auth/google/connect?service=google_calendar - Initiate OAuth */
export async function GET(req: NextRequest) {
  try {
    await getCurrentUser();

    const service = req.nextUrl.searchParams.get("service");
    if (!service || !ALLOWED_SERVICES.includes(service as (typeof ALLOWED_SERVICES)[number])) {
      return NextResponse.redirect(
        new URL("/settings/connections?error=invalid_service", req.url)
      );
    }

    const oauth2 = getGoogleOAuth2Client();
    const scopes = getScopesForService(service as "google_calendar" | "gmail");
    const state = Buffer.from(JSON.stringify({ service, nonce: crypto.randomUUID() })).toString("base64url");
    const redirectUrl = oauth2.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: scopes.join(" "),
      state,
    });

    const res = NextResponse.redirect(redirectUrl);
    res.cookies.set("google_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    });
    return res;
  } catch (e) {
    console.error("[auth/google/connect]", e);
    return NextResponse.redirect(
      new URL("/settings/connections?error=auth_failed", req.url)
    );
  }
}
