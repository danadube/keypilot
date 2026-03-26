import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createUserActivity } from "@/lib/activity-foundation";
import { withRLSContext } from "@/lib/db-context";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import { CreateUserActivityBodySchema } from "@/lib/validations/user-activity";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();

    const activities = await withRLSContext(user.id, (tx) =>
      tx.userActivity.findMany({
        where: { userId: user.id },
        orderBy: { updatedAt: "desc" },
        include: {
          property: {
            select: { id: true, address1: true, city: true, state: true },
          },
          contact: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      })
    );

    return NextResponse.json({ data: activities });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();
    const parsed = CreateUserActivityBodySchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Invalid input", 400);
    }

    const activity = await withRLSContext(user.id, (tx) =>
      createUserActivity(tx, {
        userId: user.id,
        ...parsed.data,
      })
    );

    return NextResponse.json({ data: activity }, { status: 201 });
  } catch (e) {
    const err = e as { status?: number; message?: string };
    if (err.status === 404) {
      return NextResponse.json({ error: { message: err.message } }, { status: 404 });
    }
    if (err.status === 400) {
      return NextResponse.json({ error: { message: err.message } }, { status: 400 });
    }
    return apiErrorFromCaught(e);
  }
}
