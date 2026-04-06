/**
 * Shared SWR fetcher for KeyPilot API routes.
 * All `/api/v1/` endpoints return `{ data: T }` on success
 * and `{ error: { message: string } }` on failure.
 */
export async function apiFetcher<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error?.message ?? `Request failed (${res.status})`);
  }
  if (json.error) {
    throw new Error(json.error.message);
  }
  return json.data as T;
}
