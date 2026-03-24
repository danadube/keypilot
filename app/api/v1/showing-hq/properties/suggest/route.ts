/**
 * GET — suggest existing properties for Supra review (address + state + city and/or ZIP).
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prismaAdmin } from "@/lib/db";
import { apiError, apiErrorFromCaught } from "@/lib/api-response";
import { PropertySuggestQuerySchema } from "@/lib/validations/showing-hq-suggest";
import { suggestPropertiesForUser } from "@/lib/showing-hq/suggest-matches";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const sp = req.nextUrl.searchParams;
    const parsed = PropertySuggestQuerySchema.safeParse({
      address1: sp.get("address1") ?? sp.get("address") ?? "",
      city: sp.get("city") ?? "",
      state: sp.get("state") ?? "",
      zip: sp.get("zip") ?? "",
    });
    if (!parsed.success) {
      return apiError("address1, city, and state are required", 400, "VALIDATION_ERROR");
    }

    const suggestions = await suggestPropertiesForUser(prismaAdmin, user.id, parsed.data);
    return NextResponse.json({ data: { suggestions } });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}
