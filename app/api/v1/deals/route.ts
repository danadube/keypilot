import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { withRLSContext } from "@/lib/db-context";
import { CreateDealSchema } from "@/lib/validations/deal";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import { DealStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as DealStatus | null;

    const deals = await withRLSContext(user.id, (tx) =>
      tx.deal.findMany({
        where: {
          userId: user.id,
          ...(status ? { status } : {}),
        },
        include: {
          contact: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              status: true,
            },
          },
          property: {
            select: {
              id: true,
              address1: true,
              city: true,
              state: true,
              zip: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      })
    );

    return NextResponse.json({ data: deals });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();
    const parsed = CreateDealSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Invalid input", 400);
    }

    const { contactId, propertyId } = parsed.data;

    const deal = await withRLSContext(user.id, async (tx) => {
      // FK scope validation — runs under RLS so findFirst returns null if the
      // resource belongs to another user. This is the app-layer enforcement
      // required by RLS ambiguity #3 (deals.userId is the only RLS anchor;
      // contactId and propertyId are not checked by the DB policy).
      const property = await tx.property.findFirst({
        where: { id: propertyId },
        select: { id: true },
      });
      if (!property) throw Object.assign(new Error("Property not found or not accessible"), { status: 404 });

      const contact = await tx.contact.findFirst({
        where: { id: contactId },
        select: { id: true },
      });
      if (!contact) throw Object.assign(new Error("Contact not found or not accessible"), { status: 404 });

      return tx.deal.create({
        data: {
          contactId,
          propertyId,
          userId: user.id,
        },
        include: {
          contact: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          property: {
            select: {
              id: true,
              address1: true,
              city: true,
              state: true,
              zip: true,
            },
          },
        },
      });
    });

    return NextResponse.json({ data: deal }, { status: 201 });
  } catch (e) {
    const err = e as { status?: number; message?: string };
    if (err.status === 404) {
      return NextResponse.json({ error: { message: err.message } }, { status: 404 });
    }
    return apiErrorFromCaught(e);
  }
}
