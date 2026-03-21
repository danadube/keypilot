import { AsyncLocalStorage } from "node:async_hooks";

interface UserContext {
  /** The Prisma User.id UUID — NOT the Clerk string ID. */
  userId: string;
}

/**
 * Stores the current request's User.id so Prisma context helpers can read it
 * without threading it through every function signature.
 *
 * Usage:
 *   import { userContext } from "@/lib/user-context";
 *   userContext.run({ userId: user.id }, async () => { ... });
 *
 * Reading:
 *   import { getUserContext } from "@/lib/user-context";
 *   const ctx = getUserContext(); // undefined outside a run() scope
 */
export const userContext = new AsyncLocalStorage<UserContext>();

export function getUserContext(): UserContext | undefined {
  return userContext.getStore();
}
