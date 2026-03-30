import { prismaAdmin } from "@/lib/db";
import { Prisma } from "@prisma/client";

/** Deterministic unique local email when Clerk email is already owned by another user row. */
export function clerkPlaceholderEmail(clerkId: string): string {
  const safe = clerkId.replace(/[^a-zA-Z0-9_-]/g, "_");
  return `user_${safe}@clerk.placeholder.keypilot`;
}

async function pickStorableEmail(
  clerkId: string,
  desiredEmail: string
): Promise<string> {
  const rival = await prismaAdmin.user.findFirst({
    where: { email: desiredEmail, NOT: { clerkId } },
    select: { id: true },
  });
  if (rival) return clerkPlaceholderEmail(clerkId);
  return desiredEmail;
}

/**
 * Upserts the local `users` row for a Clerk account. Resolves unique `email` conflicts so
 * first request / webhook sync does not 500 the whole API surface.
 */
export async function upsertUserFromClerkPayload(input: {
  clerkId: string;
  name: string;
  rawEmail: string | null | undefined;
}) {
  const { clerkId, name } = input;
  const baseEmail =
    input.rawEmail?.trim() ||
    `user-${clerkId.replace(/[^a-zA-Z0-9_-]/g, "_")}@placeholder.local`;
  let email = await pickStorableEmail(clerkId, baseEmail);

  try {
    return await prismaAdmin.user.upsert({
      where: { clerkId },
      create: { clerkId, name, email },
      update: { name, email },
    });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      email = clerkPlaceholderEmail(clerkId);
      return prismaAdmin.user.upsert({
        where: { clerkId },
        create: { clerkId, name, email },
        update: { name, email },
      });
    }
    throw e;
  }
}
