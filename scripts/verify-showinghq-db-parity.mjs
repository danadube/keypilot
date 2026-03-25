/**
 * Read-only: expected ShowingHQ/Supra columns vs Postgres information_schema.
 * Run from repo root: node scripts/verify-showinghq-db-parity.mjs
 */
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { config } from "dotenv";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: join(root, ".env.local") });

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const expected = [
  { table: "showings", column: "feedbackDraftSubject" },
  { table: "showings", column: "feedbackDraftBody" },
  { table: "showings", column: "feedbackDraftGeneratedAt" },
  { table: "supra_queue_items", column: "parsedShowingBeganAt" },
];

const tableExists = async (table) => {
  const rows = await prisma.$queryRaw`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ${table}
    ) AS ok;
  `;
  return Boolean(rows[0]?.ok);
};

const columnExists = async (table, column) => {
  const rows = await prisma.$queryRaw`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = ${table}
        AND column_name = ${column}
    ) AS ok;
  `;
  return Boolean(rows[0]?.ok);
};

try {
  console.log("ShowingHQ / Supra DB parity (public schema)\n");

  for (const { table, column } of expected) {
    const tOk = await tableExists(table);
    const cOk = tOk ? await columnExists(table, column) : false;
    const status = !tOk ? "MISSING TABLE" : cOk ? "OK" : "MISSING COLUMN";
    console.log(`${table}.${column}: ${status}`);
  }

  const missing = [];
  for (const { table, column } of expected) {
    if (!(await tableExists(table))) {
      missing.push(`${table} (table)`);
      continue;
    }
    if (!(await columnExists(table, column))) missing.push(`${table}.${column}`);
  }

  if (missing.length) {
    console.log("\nMismatch summary:", missing.join(", "));
    process.exitCode = 1;
  } else {
    console.log("\nAll listed columns present.");
  }
} finally {
  await prisma.$disconnect();
}
