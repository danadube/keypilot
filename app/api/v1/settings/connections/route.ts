import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiErrorFromCaught } from "@/lib/api-response";
import {
  CONNECTION_CONFIGS,
  prismaStatusToLib,
  PRISMA_TO_SERVICE,
  type ConnectionRecord,
} from "@/lib/connections";

export const dynamic = "force-dynamic";

/** GET /api/v1/settings/connections - List all connections (multi-account) */
export async function GET() {
  try {
    const user = await getCurrentUser();

    const dbConnections = await prisma.connection.findMany({
      where: { userId: user.id },
    });

    const connections: ConnectionRecord[] = dbConnections
      .filter((c) => PRISMA_TO_SERVICE[c.service])
      .map((c) => {
      const service = PRISMA_TO_SERVICE[c.service];
      const config = service
        ? CONNECTION_CONFIGS.find(
            (cf) =>
              cf.provider === (c.provider.toLowerCase() as "google" | "microsoft" | "apple") &&
              cf.service === service
          )
        : null;
      return {
        id: c.id,
        provider: (c.provider.toLowerCase() as "google" | "microsoft" | "apple"),
        service: service!,
        configId: config?.id ?? `${c.provider}-${c.service}`,
        accountEmail: c.accountEmail,
        accountLabel: c.accountLabel,
        status: prismaStatusToLib(c.status),
        isDefault: c.isDefault,
        isEnabled: c.isEnabled,
        enabledForAi: c.enabledForAi,
        enabledForCalendar: c.enabledForCalendar,
        enabledForPriorityInbox: c.enabledForPriorityInbox,
        lastSyncAt: c.lastSyncAt?.toISOString() ?? null,
        connectedAt: c.connectedAt?.toISOString() ?? null,
        errorMessage: c.errorMessage,
        };
      });

    return NextResponse.json({ data: { connections } });
  } catch (e) {
    return apiErrorFromCaught(e);
  }
}
