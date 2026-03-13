import { NextResponse } from "next/server";

export type ApiErrorShape = {
  error: { message: string; code?: string };
};

/**
 * Returns a consistent API error response.
 * Use for 4xx/5xx responses.
 */
export function apiError(
  message: string,
  status = 500,
  code?: string
): NextResponse<ApiErrorShape> {
  const body: ApiErrorShape = {
    error: code ? { message, code } : { message },
  };
  return NextResponse.json(body, { status });
}

/**
 * Handles caught errors in API routes.
 * - "Unauthorized" → 401 (from getCurrentUser)
 * - All other errors → 500 with generic message (never leak internal details)
 */
export function apiErrorFromCaught(
  e: unknown,
  options?: { log?: boolean }
): NextResponse<ApiErrorShape> {
  const msg = e instanceof Error ? e.message : "Unknown error";
  if (options?.log !== false && process.env.NODE_ENV !== "test") {
    console.error("[API Error]", e);
  }
  if (msg === "Unauthorized") {
    return apiError("Unauthorized", 401);
  }
  const code = (e instanceof Error && (e as Error & { code?: string }).code)
    ? (e as Error & { code?: string }).code
    : undefined;
  if (code === "CRM_ACCESS_REQUIRED") {
    return apiError("CRM access required", 403, code);
  }
  return apiError("Internal server error", 500);
}
