import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

/**
 * prismaAdmin — the global Prisma client that runs as the `postgres` role.
 *
 * The postgres role has BYPASSRLS=true, meaning ALL row-level security policies
 * are skipped. This is intentional for:
 *   - Public routes that have no Clerk auth context (visitor-signin, flyer, feedback)
 *   - Cross-user reads (analytics/summary)
 *   - System jobs, webhooks, and auth sync (auth/webhook, Clerk sync)
 *   - Hydrating data after RLS-confirmed ownership (e.g. /commissions/mine step 2)
 *
 * For user-scoped routes, use withRLSContext() from lib/db-context.ts instead.
 * withRLSContext switches to the keypilot_app role, which enforces per-user RLS policies.
 */
if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

export const prismaAdmin = globalForPrisma.prisma;

/**
 * @deprecated Use prismaAdmin for explicit BYPASSRLS intent, or withRLSContext for
 * user-scoped queries. This alias exists for backward compatibility only.
 */
export const prisma = prismaAdmin;
