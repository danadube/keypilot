import { Prisma } from "@prisma/client";
import { prismaAdmin } from "@/lib/db";
import { rlsStore } from "@/lib/rls-guard";

/** Thrown only when GUC / `SET LOCAL ROLE keypilot_app` fails (setup), not when `fn` throws. */
class RlsTransactionSetupError extends Error {
  constructor(cause: unknown) {
    const msg = cause instanceof Error ? cause.message : String(cause);
    super(msg);
    this.name = "RlsTransactionSetupError";
  }
}

function shouldBypassRlsWithAdminRead(e: unknown): boolean {
  if (e instanceof RlsTransactionSetupError) return true;
  const fromErr = (err: Error | unknown) =>
    (err instanceof Error ? err.message : String(err)).toLowerCase();
  const msg = fromErr(e);
  if (
    msg.includes("permission denied") ||
    msg.includes("row-level security") ||
    msg.includes("violates row-level security") ||
    msg.includes("insufficient privilege") ||
    // After a failed statement under RLS, Postgres often surfaces only this on follow-up queries in the same tx.
    msg.includes("current transaction is aborted") ||
    msg.includes("25p02")
  ) {
    return true;
  }
  // SET LOCAL ROLE keypilot_app when migration never created the role
  if (
    msg.includes("keypilot_app") &&
    (msg.includes("does not exist") || msg.includes("invalid role"))
  ) {
    return true;
  }
  // Raw query failures sometimes surface as P2010 with details in meta
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2010") {
    const raw = fromErr(
      typeof e.meta?.message === "string" ? new Error(e.meta.message) : e
    );
    return (
      raw.includes("permission denied") ||
      raw.includes("row-level security") ||
      raw.includes("insufficient privilege") ||
      raw.includes("current transaction is aborted")
    );
  }
  return false;
}

/**
 * Executes `fn` inside one Prisma interactive transaction with DB-enforced RLS.
 *
 * Same `tx` for the whole callback (one connection, one Postgres transaction):
 *   1. `SELECT set_config('app.current_user_id', userId, true)` — transaction-local GUC
 *      used by `app.current_user_id()` in policies (set while connection is still `postgres`).
 *   2. `SET LOCAL ROLE keypilot_app` — enforce RLS (non-BYPASSRLS); LOCAL = tx-scoped.
 *   3. `await fn(tx)` — all DB work must use this `tx`; never `prismaAdmin` inside `fn`.
 *
 * Tables with RLS policies targeting `keypilot_app` enforce per-user isolation on `tx`.
 * Plain `prismaAdmin` queries stay `postgres` (BYPASSRLS=true).
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
      try {
        await tx.$executeRaw`
          SELECT set_config('app.current_user_id', ${userId}, true)
        `;
        await tx.$executeRawUnsafe(`SET LOCAL ROLE keypilot_app`);
      } catch (setupErr) {
        throw new RlsTransactionSetupError(setupErr);
      }
      // TEMP DEBUG: remove after FarmTrackr import RLS is verified in production.
      const rls = await tx.$queryRawUnsafe<Array<{ user_id: unknown }>>(`
        select app.current_user_id() as user_id
      `);
      console.log("RLS USER:", rls, "EXPECTED:", userId);
      return await fn(tx);
    })
  );
}

const RLS_FALLBACK_TAG = "[withRLSContextOrFallbackAdmin]";

/**
 * Like {@link withRLSContext}, but if the role switch or RLS transaction fails
 * (e.g. `keypilot_app` missing in a lagging env), re-runs `fn` with `prismaAdmin`.
 *
 * **Only for read paths** where every query already scopes by `userId` / `hostUserId`
 * / ownership — same effective rows as RLS would allow for that user.
 */
export async function withRLSContextOrFallbackAdmin<T>(
  userId: string,
  label: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  try {
    return await withRLSContext(userId, fn);
  } catch (e) {
    if (!shouldBypassRlsWithAdminRead(e)) {
      throw e;
    }
    const msg = e instanceof Error ? e.message : String(e);
    console.error(RLS_FALLBACK_TAG, "admin_bypass_after_rls_failure", {
      label,
      message: msg,
    });
    return fn(prismaAdmin as unknown as Prisma.TransactionClient);
  }
}
