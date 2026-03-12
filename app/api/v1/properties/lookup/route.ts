import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  lookupPropertyByMls,
  lookupPropertyByAddress,
} from "@/lib/mls-lookup";

export async function GET(req: NextRequest) {
  try {
    await getCurrentUser();
  } catch {
    return NextResponse.json({ error: { message: "Unauthorized" } }, { status: 401 });
  }

  const mls = req.nextUrl.searchParams.get("mls")?.trim();
  const address = req.nextUrl.searchParams.get("address")?.trim();

  if (address) {
    const result = await lookupPropertyByAddress(address);
    if (result.ok) return NextResponse.json({ data: result.data });
    if (result.reason === "no_key") {
      return NextResponse.json(
        {
          error: {
            message:
              "Address lookup is disabled. Add RENTCAST_API_KEY (app.rentcast.io) to enable. See docs/SETUP.md.",
          },
        },
        { status: 501 }
      );
    }
    if (result.reason === "api_error") {
      const msg =
        result.status === 401
          ? "RentCast API key invalid. Check it at app.rentcast.io and update RENTCAST_API_KEY."
          : "RentCast API error. Check your key at app.rentcast.io. Free tier: 50 calls/month.";
      return NextResponse.json({ error: { message: msg } }, { status: 502 });
    }
    return NextResponse.json(
      {
        error: {
          message:
            "Address not found. Try: Street, City, State ZIP (e.g. 123 Main St, Denver, CO 80202).",
        },
      },
      { status: 404 }
    );
  }

  if (mls) {
    const result = await lookupPropertyByMls(mls);
    if (result) return NextResponse.json({ data: result });
    return NextResponse.json(
      {
        error: {
          message:
            "MLS lookup is not configured. Add MLS_LOOKUP_API_URL and MLS_LOOKUP_API_KEY to enable. See docs/SETUP.md.",
        },
      },
      { status: 501 }
    );
  }

  return NextResponse.json(
    { error: { message: "Provide mls= or address= query parameter" } },
    { status: 400 }
  );
}
