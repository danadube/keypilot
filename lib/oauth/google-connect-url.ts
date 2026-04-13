/**
 * Browser-safe OAuth connect URLs only — do not import `google.ts` (pulls in googleapis).
 * Keep defaults in sync with `getGoogleOAuthRedirectOrigin()` in `lib/oauth/google.ts`.
 */
const DEFAULT_CANONICAL = "https://danadube.com";

function getCanonicalOrigin(): string {
  return (process.env.NEXT_PUBLIC_GOOGLE_OAUTH_CANONICAL_ORIGIN?.trim() || DEFAULT_CANONICAL).replace(
    /\/$/,
    ""
  );
}

/**
 * Full URL to start Google OAuth on the canonical host.
 * Optional `returnOrigin` (usually `window.location.origin`) sends the user back after auth.
 */
export function buildGoogleOAuthConnectUrl(
  service: "google_calendar" | "gmail",
  returnOrigin?: string
): string {
  const canonical = getCanonicalOrigin();
  const params = new URLSearchParams({ service });
  const ret = (returnOrigin ?? canonical).replace(/\/$/, "");
  if (ret !== canonical) {
    params.set("return_url", ret);
  }
  return `${canonical}/api/v1/auth/google/connect?${params.toString()}`;
}
