import { auth, clerkClient } from "@clerk/nextjs/server";
import { upsertUserFromClerkPayload } from "./clerk-user-db-sync";
import { prismaAdmin } from "./db";

/** Sync user from Clerk into our DB when webhook hasn't run (e.g. local dev or webhook failure). */
async function syncUserFromClerk(clerkId: string) {
  const client = await clerkClient();
  const clerkUser = await client.users.getUser(clerkId);
  const name =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
    "User";
  const rawEmail = clerkUser.emailAddresses?.[0]?.emailAddress;
  return upsertUserFromClerkPayload({
    clerkId,
    name,
    rawEmail,
  });
}

export async function getCurrentUser() {
  let userId: string | undefined;
  try {
    const session = await auth();
    userId = session.userId ?? undefined;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // Clerk throws when session headers are missing (e.g. middleware not applied).
    // Map to Unauthorized so API routes return 401 instead of a generic 500.
    if (
      msg.includes("can't detect usage of clerkMiddleware") ||
      msg.includes("auth() was called but Clerk can't detect")
    ) {
      throw new Error("Unauthorized");
    }
    throw e;
  }
  if (!userId) {
    throw new Error("Unauthorized");
  }
  let user = await prismaAdmin.user.findUnique({
    where: { clerkId: userId },
  });
  if (!user) {
    try {
      user = await syncUserFromClerk(userId);
    } catch (e) {
      console.error("[auth] syncUserFromClerk failed", e);
      const err = new Error(
        "Account setup is incomplete. Try again shortly, or sign out and sign in."
      );
      (err as Error & { code?: string }).code = "USER_PROVISIONING_FAILED";
      throw err;
    }
  }
  if (!user) {
    const err = new Error(
      "No application account found for this sign-in. Try signing out and signing in again."
    );
    (err as Error & { code?: string }).code = "USER_NOT_PROVISIONED";
    throw err;
  }
  return user;
}

export async function getCurrentUserOrNull() {
  let userId: string | undefined;
  try {
    const session = await auth();
    userId = session.userId ?? undefined;
  } catch {
    return null;
  }
  if (!userId) {
    return null;
  }
  let user = await prismaAdmin.user.findUnique({
    where: { clerkId: userId },
  });
  if (!user) {
    try {
      user = await syncUserFromClerk(userId);
    } catch {
      return null;
    }
  }
  return user;
}
