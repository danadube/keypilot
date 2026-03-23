/**
 * App version and optional commit hash, injected at build time via next.config env.
 * Source of truth for version is package.json (see next.config.mjs). Commit is short git hash when available.
 *
 * IMPORTANT: Reference `process.env.NEXT_PUBLIC_*` directly below. Next.js inlines these
 * literals at compile time; reading via `process.env` assigned to a variable breaks
 * inlining and the client bundle falls back to "0.0.0".
 */
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";

/** Short git commit hash (e.g. abc1234), empty string if not available. */
export const APP_COMMIT = process.env.NEXT_PUBLIC_APP_COMMIT ?? "";
