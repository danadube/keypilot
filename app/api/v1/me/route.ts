import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { apiErrorFromCaught } from "@/lib/api-response";

export async function GET() {
  try {
    const user = await getCurrentUser();
    return NextResponse.json({
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        productTier: user.productTier,
      },
    });
  } catch (err) {
    return apiErrorFromCaught(err);
  }
}
