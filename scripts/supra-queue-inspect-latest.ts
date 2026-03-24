/**
 * One-off: print the latest Gmail-imported Supra queue row(s) for debugging body vs parser.
 * Usage: npx tsx scripts/supra-queue-inspect-latest.ts [limit]
 * Loads .env.local for DATABASE_URL (local/dev only).
 */

import { config } from "dotenv";
import { resolve } from "path";
import { PrismaClient } from "@prisma/client";
import { diagnoseSupraImportedBody } from "../lib/integrations/supra/diagnose-supra-imported-body";

config({ path: resolve(process.cwd(), ".env.local") });

const prisma = new PrismaClient();

async function main() {
  const limit = Math.min(5, Math.max(1, parseInt(process.argv[2] || "2", 10) || 2));
  const total = await prisma.supraQueueItem.count();
  const gmailN = await prisma.supraQueueItem.count({
    where: { externalMessageId: { startsWith: "gmail-" } },
  });
  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify({ counts: { totalSupraQueueItems: total, gmailExternalId: gmailN } })
  );

  const rows = await prisma.supraQueueItem.findMany({
    where: { externalMessageId: { startsWith: "gmail-" } },
    orderBy: { receivedAt: "desc" },
    take: limit,
    select: {
      id: true,
      subject: true,
      sender: true,
      externalMessageId: true,
      rawBodyText: true,
      parsedAddress1: true,
      parsedCity: true,
      parsedState: true,
      parsedZip: true,
      parsedScheduledAt: true,
      parsedEventKind: true,
      parsedStatus: true,
      parsedAgentName: true,
      parsedAgentEmail: true,
      parseConfidence: true,
      proposedAction: true,
      queueState: true,
      receivedAt: true,
      updatedAt: true,
    },
  });

  if (rows.length === 0) {
    // eslint-disable-next-line no-console
    console.log("No gmail-* rows found (try limit on all sources).");
    return;
  }

  for (const r of rows) {
    const body = r.rawBodyText ?? "";
    const diag = {
      ...diagnoseSupraImportedBody(body),
      first200: body.slice(0, 200).replace(/\n/g, "\\n"),
    };
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ ...r, rawBodyText: body, _diag: diag }, null, 2));
    // eslint-disable-next-line no-console
    console.log("---");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
