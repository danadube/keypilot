import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { upsertUserFromClerkPayload } from "@/lib/clerk-user-db-sync";

export async function POST(req: NextRequest) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET?.trim();
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
  let wh: Webhook;
  try {
    wh = new Webhook(WEBHOOK_SECRET);
  } catch (err) {
    console.error("Invalid CLERK_WEBHOOK_SECRET (check for extra spaces or wrong value):", err);
    return NextResponse.json(
      { error: { message: "Webhook secret is invalid. In Vercel, re-copy the Signing Secret from Clerk (no spaces)." } },
      { status: 500 }
    );
  }

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
    const rawEmail = email_addresses?.[0]?.email_address;
    try {
      await upsertUserFromClerkPayload({
        clerkId: id,
        name,
        rawEmail,
      });
    } catch (err) {
      console.error("Webhook user.created DB error:", err);
      return NextResponse.json(
        { error: { message: "Database error syncing user" } },
        { status: 500 }
      );
    }
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
    const rawEmail = email_addresses?.[0]?.email_address;
    try {
      await upsertUserFromClerkPayload({
        clerkId: id,
        name,
        rawEmail,
      });
    } catch (err) {
      console.error("Webhook user.updated DB error:", err);
      return NextResponse.json(
        { error: { message: "Database error updating user" } },
        { status: 500 }
      );
    }
    return NextResponse.json({ received: true });
  }

  return NextResponse.json({ received: true });
}
