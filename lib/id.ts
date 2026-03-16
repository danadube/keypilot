import { nanoid } from "nanoid";

/**
 * Generate a URL-safe random id. Used for flyer link tokens, etc.
 * Wrapped so tests can mock without importing ESM nanoid.
 */
export function generateId(size: number = 24): string {
  return nanoid(size);
}
