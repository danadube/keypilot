import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiErrorFromCaught } from "@/lib/api-response";
import {
  CONNECTION_CONFIGS,
  prismaStatusToLib,
  SERVICE_TO_PRISMA,
} from "@/lib/connections";

export const dynamic = "force-dynamic";

/** GET /api/v1/settings/connections - List all connections with status */
export async function GET() {
  try {
    const user = await getCurrentUser();

    const dbConnections = await prisma.connection.findMany({
      where: { userId: user.id },
    });

    const states = CONNECTION_CONFIGS.map((config) => {
      const db = dbConnections.find(
        (c) =>
          c.provider === config.provider.toUpperCase() &&
          c.service === SERVICE_TO_PRISMA[config.service]
      );
      return {
        config,
        dbId: db?.id,
        status: db ? prismaStatusToLib(db.status) : "disconnected" as const,
        lastSyncAt: db?.lastSyncAt?.toISOString() ?? null,
        connectedAt: db?.connectedAt?.toISOString() ?? null,
        errorMessage: db?.errorMessage ?? null,
      };
    });

    return NextResponse.json({ data: states });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}
