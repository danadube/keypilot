import { auth, clerkClient } from "@clerk/nextjs/server";
import { prismaAdmin } from "./db";

/** Sync user from Clerk into our DB when webhook hasn't run (e.g. local dev or webhook failure). */
async function syncUserFromClerk(clerkId: string) {
  const client = await clerkClient();
  const clerkUser = await client.users.getUser(clerkId);
  const name =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
    "User";
  const email =
    clerkUser.emailAddresses?.[0]?.emailAddress ??
    `user-${clerkId}@placeholder.local`;
  const user = await prismaAdmin.user.upsert({
    where: { clerkId },
    create: { clerkId, name, email },
    update: { name, email },
  });
  return user;
}

export async function getCurrentUser() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized");
  }
  let user = await prismaAdmin.user.findUnique({
    where: { clerkId: userId },
  });
  if (!user) {
    user = await syncUserFromClerk(userId);
  }
  return user;
}

export async function getCurrentUserOrNull() {
  const { userId } = await auth();
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
