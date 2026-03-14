import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { apiErrorFromCaught } from "@/lib/api-response";
import type { ModuleAccessMap } from "@/lib/module-access";

export async function GET() {
  try {
    const user = await getCurrentUser();
    const moduleAccess: ModuleAccessMap | null =
      user.moduleAccess && typeof user.moduleAccess === "object"
        ? (user.moduleAccess as ModuleAccessMap)
        : null;

    return NextResponse.json({
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        productTier: user.productTier,
        moduleAccess,
      },
    });
  } catch (err) {
    return apiErrorFromCaught(err);
  }
}
