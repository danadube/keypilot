/**
 * RLS regression guard — prevents accidental BYPASSRLS usage in user-scoped code.
 *
 * HOW IT WORKS
 *   withRLSContext (lib/db-context.ts) wraps every user-scoped DB transaction in
 *   an AsyncLocalStorage scope, storing the active userId. assertRLSContext() reads
 *   that storage and throws if no scope is found.
 *
 * WHEN TO USE
 *   Call assertRLSContext() (or requireRLS()) at the top of any helper function
 *   that performs user-scoped DB reads/writes and MUST only be called from within
 *   a withRLSContext transaction.
 *
 *   Example:
 *     async function getContactSummary(tx: Prisma.TransactionClient, id: string) {
 *       assertRLSContext(); // prevents accidental prismaAdmin usage here
 *       return tx.contact.findFirst({ where: { id } });
 *     }
 *
 * WHEN NOT TO USE
 *   - Public routes: visitor-signin, feedback/submit, flyer rendering
 *   - Analytics routes: /api/v1/analytics/summary reads cross-user data intentionally
 *   - Auth/webhook routes: /api/v1/auth/webhook runs as system
 *   - System jobs, cron, background tasks
 *   These routes use prismaAdmin (BYPASSRLS) by design.
 */

import { AsyncLocalStorage } from "async_hooks";

// Internal store — set by withRLSContext, read by assertRLSContext / requireRLS.
// Exported so db-context.ts can call rlsStore.run() without circular import.
export const rlsStore = new AsyncLocalStorage<{ userId: string }>();

/**
 * Returns the userId set by the nearest enclosing withRLSContext call,
 * or undefined if not inside one.
 */
export function getRLSUserId(): string | undefined {
  return rlsStore.getStore()?.userId;
}

/**
 * Throws if the current call is not inside a withRLSContext transaction.
 * Use at the top of helper functions that must be RLS-enforced.
 */
export function assertRLSContext(): void {
  const store = rlsStore.getStore();
  if (!store?.userId) {
    throw new Error(
      "assertRLSContext: called outside a withRLSContext transaction. " +
        "All user-scoped DB operations must run inside withRLSContext. " +
        "If this route intentionally bypasses RLS, use prismaAdmin and remove this guard."
    );
  }
}

/**
 * Executes fn after asserting the call is inside a withRLSContext transaction.
 * Equivalent to assertRLSContext() + fn().
 *
 * Usage:
 *   const rows = await requireRLS(() => tx.deal.findMany({ where: { userId } }));
 */
export async function requireRLS<T>(fn: () => Promise<T>): Promise<T> {
  assertRLSContext();
  return fn();
}
