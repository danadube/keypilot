import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { withRLSContext } from "@/lib/db-context";
import { UpdateDealSchema } from "@/lib/validations/deal";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";

const dealDetailInclude = {
  contact: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      status: true,
      notes: true,
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
  linkedTransaction: {
    select: {
      id: true,
      status: true,
      salePrice: true,
    },
  },
} as const;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    const deal = await withRLSContext(user.id, (tx) =>
      tx.deal.findFirst({
        where: { id, userId: user.id },
        include: dealDetailInclude,
      })
    );

    if (!deal) {
      return NextResponse.json(
        { error: { message: "Deal not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: deal });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;
    const body = await req.json();
    const parsed = UpdateDealSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Invalid input", 400);
    }

    const deal = await withRLSContext(user.id, async (tx) => {
      const existing = await tx.deal.findFirst({
        where: { id, userId: user.id },
        select: { id: true },
      });
      if (!existing) return null;

      return tx.deal.update({
        where: { id },
        data: parsed.data,
        include: dealDetailInclude,
      });
    });

    if (!deal) {
      return NextResponse.json(
        { error: { message: "Deal not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: deal });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    const deleted = await withRLSContext(user.id, async (tx) => {
      const existing = await tx.deal.findFirst({
        where: { id, userId: user.id },
        select: { id: true },
      });
      if (!existing) return false;

      await tx.deal.delete({ where: { id } });
      return true;
    });

    if (!deleted) {
      return NextResponse.json(
        { error: { message: "Deal not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: { deleted: true } });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}
