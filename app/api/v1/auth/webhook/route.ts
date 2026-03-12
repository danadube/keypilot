import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: { message: "Webhook secret not configured" } },
      { status: 500 }
    );
  }

  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const signature = req.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !signature) {
    return NextResponse.json(
      { error: { message: "Missing Svix headers" } },
      { status: 400 }
    );
  }

  const body = await req.text();
  const wh = new Webhook(WEBHOOK_SECRET);

  let event: { type: string; data: { id?: string; first_name?: string; last_name?: string; email_addresses?: { email_address: string }[] } };
  try {
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": signature,
    }) as typeof event;
  } catch {
    return NextResponse.json(
      { error: { message: "Invalid signature" } },
      { status: 400 }
    );
  }

  if (event.type === "user.created") {
    const { id, first_name, last_name, email_addresses } = event.data;
    if (!id) {
      return NextResponse.json(
        { error: { message: "Missing user id" } },
        { status: 400 }
      );
    }
    const name = [first_name, last_name].filter(Boolean).join(" ") || "User";
    const email =
      email_addresses?.[0]?.email_address ?? `user-${id}@placeholder.local`;
    await prisma.user.create({
      data: {
        clerkId: id,
        name,
        email,
      },
    });
    return NextResponse.json({ received: true });
  }

  if (event.type === "user.updated") {
    const { id, first_name, last_name, email_addresses } = event.data;
    if (!id) {
      return NextResponse.json(
        { error: { message: "Missing user id" } },
        { status: 400 }
      );
    }
    const name = [first_name, last_name].filter(Boolean).join(" ") || "User";
    const email =
      email_addresses?.[0]?.email_address ?? `user-${id}@placeholder.local`;
    await prisma.user.update({
      where: { clerkId: id },
      data: { name, email },
    });
    return NextResponse.json({ received: true });
  }

  return NextResponse.json({ received: true });
}
