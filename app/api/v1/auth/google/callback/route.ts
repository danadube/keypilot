import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getGoogleOAuth2Client } from "@/lib/oauth/google";
import { prisma } from "@/lib/db";
import { trackUsageEvent } from "@/lib/track-usage";

export const dynamic = "force-dynamic";

/** GET /api/v1/auth/google/callback - OAuth callback, exchange code for tokens */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const code = req.nextUrl.searchParams.get("code");
    const state = req.nextUrl.searchParams.get("state");
    const error = req.nextUrl.searchParams.get("error");

    if (error) {
      return NextResponse.redirect(
        new URL(`/settings/connections?error=${encodeURIComponent(error)}`, req.url)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL("/settings/connections?error=missing_params", req.url)
      );
    }

    const stateCookie = req.cookies.get("google_oauth_state")?.value;
    if (!stateCookie || stateCookie !== state) {
      return NextResponse.redirect(
        new URL("/settings/connections?error=invalid_state", req.url)
      );
    }

    let payload: { service: string; nonce: string };
    try {
      payload = JSON.parse(Buffer.from(state, "base64url").toString());
    } catch {
      return NextResponse.redirect(
        new URL("/settings/connections?error=invalid_state", req.url)
      );
    }

    const service = payload.service;
    const GOOGLE_SERVICES = ["google_calendar", "gmail"] as const;
    if (!GOOGLE_SERVICES.includes(service as (typeof GOOGLE_SERVICES)[number])) {
      return NextResponse.redirect(
        new URL("/settings/connections?error=invalid_service", req.url)
      );
    }

    const prismaService = service === "gmail" ? "GMAIL" : "GOOGLE_CALENDAR";

    const oauth2 = getGoogleOAuth2Client();
    const { tokens } = await oauth2.getToken(code);
    if (!tokens.access_token) {
      return NextResponse.redirect(
        new URL("/settings/connections?error=no_token", req.url)
      );
    }

    oauth2.setCredentials(tokens);
    const { google } = await import("googleapis");
    const oauth2Api = google.oauth2({ version: "v2", auth: oauth2 });
    const { data: userInfo } = await oauth2Api.userinfo.get();
    const accountEmail = userInfo.email ?? null;

    const tokenExpiresAt = tokens.expiry_date
      ? new Date(tokens.expiry_date)
      : new Date(Date.now() + 60 * 60 * 1000);

    const existing = await prisma.connection.findFirst({
      where: {
        userId: user.id,
        provider: "GOOGLE",
        service: prismaService,
        accountEmail,
      },
    });

    if (existing) {
      await prisma.connection.update({
        where: { id: existing.id },
        data: {
          status: "CONNECTED",
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token ?? undefined,
          tokenExpiresAt,
          connectedAt: new Date(),
          errorMessage: null,
        },
      });
    } else {
      await prisma.connection.create({
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

    const res = NextResponse.redirect(new URL(`/settings/connections?connected=${service}`, req.url));
    res.cookies.delete("google_oauth_state");
    return res;
  } catch (e) {
    console.error("[auth/google/callback]", e);
    return NextResponse.redirect(
      new URL("/settings/connections?error=auth_failed", req.url)
    );
  }
}
