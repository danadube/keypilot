/**
 * Template 5 — Public / token-based route
 *
 * Use for: routes with no Clerk session (visitor sign-in, flyer tokens, feedback).
 * Do NOT call getCurrentUser() or withRLSContext here.
 * If CI flags this route: it won't, because there is no getCurrentUser call.
 * Reference: docs/SECURE_ROUTE_TEMPLATE.md § Template 5
 *
 * File path: app/api/v1/public/widgets/[token]/route.ts
 */
import { NextRequest, NextResponse } from "next/server";
import { prismaAdmin } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    // prismaAdmin: public route — no auth context, token-based access only
    const widget = await prismaAdmin.widget.findFirst({
      where: { publicToken: params.token },
      select: {
        id: true,
        title: true,
        description: true,
        // Select only what a public visitor needs — do not expose user fields
      },
    });

    if (!widget) {
      return NextResponse.json({ error: { message: "Not found" } }, { status: 404 });
    }

    return NextResponse.json({ data: widget });
  } catch (e) {
    console.error("[widget-public] error", e);
    return NextResponse.json(
      { error: { message: "Internal server error" } },
      { status: 500 }
    );
  }
}
