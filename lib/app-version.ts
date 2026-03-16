/**
 * App version and optional commit hash, injected at build time via next.config env.
 * Source of truth for version is package.json. Commit is short git hash when available.
 */
const env = typeof process !== "undefined" ? process.env : undefined;

export const APP_VERSION = env?.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";

/** Short git commit hash (e.g. abc1234), empty string if not available. */
export const APP_COMMIT = env?.NEXT_PUBLIC_APP_COMMIT ?? "";
