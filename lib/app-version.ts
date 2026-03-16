/**
 * App version from package.json, injected at build time via next.config env.
 * Use for display only (e.g. sidebar footer); single source of truth is package.json.
 */
export const APP_VERSION =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_APP_VERSION) || "0.0.0";
