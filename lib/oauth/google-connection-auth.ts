/**
 * Shared Google OAuth2 client for stored Connection rows (Gmail, Calendar, etc.).
 * Proactively refreshes near expiry and persists new tokens to `connections`.
 */

import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import { prismaAdmin } from "@/lib/db";

const REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/auth/google/callback`
  : "http://localhost:3000/api/v1/auth/google/callback";

/** Token fields read from Connection — any Google service using the same OAuth app. */
export type GoogleConnectionTokens = {
  id: string;
  accessToken: string;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
};

function buildOAuth2Client(conn: GoogleConnectionTokens): OAuth2Client {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set");
  }
  const oauth2 = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);
  oauth2.setCredentials({
    access_token: conn.accessToken,
    refresh_token: conn.refreshToken ?? undefined,
    expiry_date: conn.tokenExpiresAt?.getTime(),
  });
  return oauth2;
}

function shouldProactivelyRefresh(tokenExpiresAt: Date | null): boolean {
  const expiresAt = tokenExpiresAt?.getTime() ?? 0;
  if (expiresAt <= 0) return false;
  return Date.now() >= expiresAt - 5 * 60 * 1000;
}

/**
 * After refreshAccessToken(), write credentials back so the next request uses a valid row.
 */
async function persistRefreshedCredentials(
  connectionId: string,
  client: OAuth2Client,
  previousRefreshToken: string | null
): Promise<void> {
  const creds = client.credentials;
  const access = creds.access_token;
  if (!access) {
    console.warn("[google-connection-auth] refresh completed without access_token", connectionId);
    return;
  }

  const refreshToken =
    creds.refresh_token != null && creds.refresh_token !== ""
      ? creds.refresh_token
      : previousRefreshToken;

  let tokenExpiresAt: Date;
  if (creds.expiry_date != null && creds.expiry_date > 0) {
    tokenExpiresAt = new Date(creds.expiry_date);
  } else {
    tokenExpiresAt = new Date(Date.now() + 3600 * 1000);
  }

  await prismaAdmin.connection.update({
    where: { id: connectionId },
    data: {
      accessToken: access,
      refreshToken: refreshToken,
      tokenExpiresAt,
    },
  });
}

/**
 * Returns an OAuth2 client ready for googleapis calls. Refreshes when expiry is within 5 minutes
 * and persists access token, refresh token (if rotated), and expiry to the connection row.
 */
export async function ensureValidGoogleOAuth2Client(
  conn: GoogleConnectionTokens
): Promise<OAuth2Client> {
  const client = buildOAuth2Client(conn);
  if (!shouldProactivelyRefresh(conn.tokenExpiresAt)) {
    return client;
  }
  await client.refreshAccessToken();
  await persistRefreshedCredentials(conn.id, client, conn.refreshToken);
  return client;
}
