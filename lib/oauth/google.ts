/**
 * Google OAuth 2.0 client for Calendar, Gmail, etc.
 */

import { google } from "googleapis";

const REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/auth/google/callback`
  : "http://localhost:3000/api/v1/auth/google/callback";

export function getGoogleOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set");
  }
  return new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);
}

export const GOOGLE_SCOPES = {
  google_calendar: [
    "https://www.googleapis.com/auth/calendar.events.readonly",
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
