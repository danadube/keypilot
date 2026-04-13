/**
 * Google OAuth 2.0 client for Calendar, Gmail, etc.
 *
 * The OAuth redirect URI is fixed to one production domain (default https://danadube.com) so
 * Google Cloud only needs a single authorized redirect URI. Preview deployments pass
 * `return_url` on connect and receive `returnTo` in signed OAuth state so post-auth redirects
 * can send users back to the preview origin.
 */

import type { NextRequest } from "next/server";
import { google } from "googleapis";

const DEFAULT_REDIRECT_ORIGIN = "https://danadube.com";

/**
 * Public site origin used for Google OAuth redirect and connect entry (no trailing slash).
 * Server: GOOGLE_OAUTH_REDIRECT_ORIGIN. Client: NEXT_PUBLIC_GOOGLE_OAUTH_CANONICAL_ORIGIN (same value).
 */
export function getGoogleOAuthRedirectOrigin(): string {
  const raw =
    process.env.GOOGLE_OAUTH_REDIRECT_ORIGIN?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CANONICAL_ORIGIN?.trim() ||
    DEFAULT_REDIRECT_ORIGIN;
  return raw.replace(/\/$/, "");
}

/** Single registered redirect URI for Google OAuth (authorize + token exchange). */
export function getFixedGoogleOAuthRedirectUri(): string {
  return `${getGoogleOAuthRedirectOrigin()}/api/v1/auth/google/callback`;
}

/** Stored-token OAuth client: any one registered redirect URI from the same client is valid. */
export function getDefaultGoogleOAuthRedirectUri(): string {
  return getFixedGoogleOAuthRedirectUri();
}

/**
 * Public origin for this request (Vercel sets x-forwarded-*). For post-OAuth UI redirects only,
 * not for Google redirect_uri.
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

/**
 * Validates `return_url` from connect query (full origin URL). Returns normalized origin or null.
 */
export function parseAllowedOAuthReturnOrigin(returnUrl: string | null): string | null {
  if (!returnUrl?.trim()) return null;
  let u: URL;
  try {
    u = new URL(returnUrl.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  const host = u.hostname.toLowerCase();
  if (host === "localhost" || host === "127.0.0.1") {
    const port = u.port ? `:${u.port}` : "";
    return `${u.protocol}//${host}${port}`;
  }
  if (host === "danadube.com" || host === "www.danadube.com") {
    return "https://danadube.com";
  }
  if (host.endsWith(".vercel.app")) {
    return `https://${host}`;
  }
  return null;
}

export function createGoogleOAuth2Client(redirectUri: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set");
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getGoogleOAuth2Client() {
  return createGoogleOAuth2Client(getFixedGoogleOAuthRedirectUri());
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
