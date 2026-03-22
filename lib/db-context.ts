import type { Prisma } from "@prisma/client";
import { prismaAdmin } from "@/lib/db";
import { rlsStore } from "@/lib/rls-guard";

/**
 * Executes `fn` inside a Prisma transaction with DB-enforced RLS context.
 *
 * What this does inside the transaction:
 *   1. SET LOCAL ROLE keypilot_app
 *      Switches to the non-BYPASSRLS role so Postgres evaluates RLS policies.
 *      "LOCAL" makes it transaction-scoped — reverts automatically on commit/rollback.
 *      Safe with PgBouncer in transaction-pooling mode.
 *
 *   2. SELECT set_config('app.current_user_id', userId, true)
 *      Sets the GUC that app.current_user_id() reads in policy expressions.
 *      The `true` flag (is_local) makes it transaction-scoped as well.
 *
 * Tables with RLS policies targeting `keypilot_app` will enforce per-user
 * isolation for queries made through `tx`. Queries using plain `prisma.*`
 * continue to run as `postgres` (BYPASSRLS=true).
 *
 * DEPLOY ORDER: DB migrations must be applied before this code reaches production.
 *   If keypilot_app role does not exist, SET LOCAL ROLE throws and the transaction
 *   aborts — this is the correct fail-safe behaviour.
 *
 * @example
 *   const connections = await withRLSContext(user.id, (tx) =>
 *     tx.connection.findMany({ where: { userId: user.id } })
 *   );
 *
 * @example — multiple operations, atomically
 *   const result = await withRLSContext(user.id, async (tx) => {
 *     const conn = await tx.connection.findFirst({ where: { id, userId: user.id } });
 *     if (!conn) return null;
 *     await tx.connection.update({ where: { id }, data: { isEnabled: false } });
 *     return conn;
 *   });
 */
export async function withRLSContext<T>(
  userId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  // rlsStore.run() makes userId available to assertRLSContext() / requireRLS()
  // anywhere in the call stack inside fn — without requiring it to be threaded
  // through as a parameter. The scope is automatically cleared on return.
  return rlsStore.run({ userId }, () =>
    prismaAdmin.$transaction(async (tx) => {
      // Set the user context first (while still postgres, before role switch).
      await tx.$executeRaw`SELECT set_config('app.current_user_id', ${userId}, true)`;
      // Switch to the constrained role — RLS policies now fire for this transaction.
      await tx.$executeRawUnsafe(`SET LOCAL ROLE keypilot_app`);
      return fn(tx);
    })
  );
}
