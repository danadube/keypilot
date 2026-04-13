/**
 * Google OAuth 2.0 client for Calendar, Gmail, etc.
 *
 * Authorization must use a redirect URI that matches the host where the user started OAuth
 * (e.g. Vercel preview URL). A single NEXT_PUBLIC_APP_URL breaks previews: Google sends the user
 * to production, the state cookie stays on preview → invalid_state, and Clerk session may not
 * match → flaky connect/reconnect.
 */

import type { NextRequest } from "next/server";
import { google } from "googleapis";

/** Canonical redirect for non-request flows (e.g. token refresh client — any registered URI works). */
export function getDefaultGoogleOAuthRedirectUri(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (base) return `${base}/api/v1/auth/google/callback`;
  return "http://localhost:3000/api/v1/auth/google/callback";
}

/**
 * Public origin for this request (Vercel sets x-forwarded-*; local uses nextUrl).
 * Use for OAuth redirect URI and post-auth redirects so they stay on the same deployment.
 */
export function getOAuthRequestOrigin(req: NextRequest): string {
  const forwardedHost = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const forwardedProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (forwardedHost) {
    const proto = forwardedProto === "http" || forwardedProto === "https" ? forwardedProto : "https";
    return `${proto}://${forwardedHost}`;
  }
  return req.nextUrl.origin;
}

export function getGoogleOAuthRedirectUriForOrigin(requestOrigin: string): string {
  const base = requestOrigin.replace(/\/$/, "");
  return `${base}/api/v1/auth/google/callback`;
}

export function createGoogleOAuth2Client(redirectUri: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set");
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/** @deprecated Prefer createGoogleOAuth2Client with getGoogleOAuthRedirectUriForOrigin(getOAuthRequestOrigin(req)) for connect/callback. */
export function getGoogleOAuth2Client() {
  return createGoogleOAuth2Client(getDefaultGoogleOAuthRedirectUri());
}

export const GOOGLE_SCOPES = {
  google_calendar: [
    "https://www.googleapis.com/auth/calendar.events.readonly",
    /** Required for `calendar.calendarList.list` so users can choose which calendars sync into KeyPilot. */
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/spreadsheets.readonly",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
  ],
  gmail: [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/spreadsheets.readonly",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
  ],
} as const;

export function getScopesForService(service: keyof typeof GOOGLE_SCOPES): string[] {
  return [...GOOGLE_SCOPES[service]];
}
