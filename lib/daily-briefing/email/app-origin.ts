/**
 * Base URL for absolute links in emails (no trailing slash).
 * Mirrors other server routes that build public URLs.
 */
export function resolveAppOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  return "https://keypilot.vercel.app";
}

/** Turn relative app paths into absolute URLs; leaves http(s) URLs unchanged. */
export function toAbsoluteHref(href: string | null, origin: string): string | null {
  if (href == null || href === "") return null;
  if (/^https?:\/\//i.test(href)) return href;
  if (href.startsWith("/")) return `${origin}${href}`;
  return `${origin}/${href}`;
}
