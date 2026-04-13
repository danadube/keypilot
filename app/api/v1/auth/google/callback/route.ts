import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  createGoogleOAuth2Client,
  getFixedGoogleOAuthRedirectUri,
  getGoogleOAuthRedirectOrigin,
} from "@/lib/oauth/google";
import { prismaAdmin } from "@/lib/db";
import { trackUsageEvent } from "@/lib/track-usage";

export const dynamic = "force-dynamic";

/** GET /api/v1/auth/google/callback - OAuth callback, exchange code for tokens */
export async function GET(req: NextRequest) {
  const canonicalBase = getGoogleOAuthRedirectOrigin();
  const redirectUri = getFixedGoogleOAuthRedirectUri();
  const oauth2 = createGoogleOAuth2Client(redirectUri);

  const code = req.nextUrl.searchParams.get("code");
  const stateParam = req.nextUrl.searchParams.get("state");
  const oauthError = req.nextUrl.searchParams.get("error");

  if (oauthError) {
    return NextResponse.redirect(
      new URL(`/settings/connections?error=${encodeURIComponent(oauthError)}`, canonicalBase)
    );
  }

  if (!code || !stateParam) {
    return NextResponse.redirect(new URL("/settings/connections?error=missing_params", canonicalBase));
  }

  const stateCookie = req.cookies.get("google_oauth_state")?.value;
  if (!stateCookie || stateCookie !== stateParam) {
    return NextResponse.redirect(new URL("/settings/connections?error=invalid_state", canonicalBase));
  }

  let payload: { service: string; nonce: string; returnTo?: string };
  try {
    payload = JSON.parse(Buffer.from(stateParam, "base64url").toString());
  } catch {
    return NextResponse.redirect(new URL("/settings/connections?error=invalid_state", canonicalBase));
  }

  const appBase = payload.returnTo ?? canonicalBase;

  try {
    const user = await getCurrentUser();

    const service = payload.service;
    const GOOGLE_SERVICES = ["google_calendar", "gmail"] as const;
    if (!GOOGLE_SERVICES.includes(service as (typeof GOOGLE_SERVICES)[number])) {
      return NextResponse.redirect(new URL("/settings/connections?error=invalid_service", appBase));
    }

    const prismaService = service === "gmail" ? "GMAIL" : "GOOGLE_CALENDAR";

    const { tokens } = await oauth2.getToken(code);
    if (!tokens.access_token) {
      return NextResponse.redirect(new URL("/settings/connections?error=no_token", appBase));
    }

    oauth2.setCredentials(tokens);
    const { google } = await import("googleapis");
    const oauth2Api = google.oauth2({ version: "v2", auth: oauth2 });
    const { data: userInfo } = await oauth2Api.userinfo.get();
    const accountEmail = userInfo.email ?? null;

    const tokenExpiresAt = tokens.expiry_date
      ? new Date(tokens.expiry_date)
      : new Date(Date.now() + 60 * 60 * 1000);

    const existing = await prismaAdmin.connection.findFirst({
      where: {
        userId: user.id,
        provider: "GOOGLE",
        service: prismaService,
        accountEmail,
      },
    });

    if (existing) {
      await prismaAdmin.connection.update({
        where: { id: existing.id },
        data: {
          status: "CONNECTED",
          accessToken: tokens.access_token,
          ...(tokens.refresh_token != null && tokens.refresh_token !== ""
            ? { refreshToken: tokens.refresh_token }
            : {}),
          tokenExpiresAt,
          connectedAt: new Date(),
          errorMessage: null,
        },
      });
    } else {
      await prismaAdmin.connection.create({
        data: {
          userId: user.id,
          provider: "GOOGLE",
          service: prismaService,
          accountEmail,
          status: "CONNECTED",
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token ?? null,
          tokenExpiresAt,
          connectedAt: new Date(),
        },
      });
    }

    if (prismaService === "GMAIL") {
      void trackUsageEvent(user.id, "gmail_connected");
    } else {
      void trackUsageEvent(user.id, "calendar_connected");
    }

    const res = NextResponse.redirect(new URL(`/settings/connections?connected=${service}`, appBase));
    res.cookies.delete("google_oauth_state");
    return res;
  } catch (e) {
    console.error("[auth/google/callback]", e);
    return NextResponse.redirect(new URL("/settings/connections?error=auth_failed", appBase));
  }
}
