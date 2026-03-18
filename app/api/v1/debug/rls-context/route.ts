/**
 * RLS diagnostic — staging-safe introspection.
 *
 * What it tells you:
 * - `current_user` / `session_user`
 * - whether the DB role has BYPASSRLS / is superuser
 * - whether Supabase JWT context is present (request.jwt claims)
 * - whether `auth.uid()` resolves (Supabase auth context)
 * - RLS enabled + policies for a curated set of tables
 *
 * Guard:
 * - Requires `x-rls-diagnostics` header to match `process.env.RLS_DIAGNOSTICS_SECRET`.
 * - If the env var is not set, the route returns 404.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const TABLES_TO_INSPECT = [
  "user_profiles",
  "users",
  "properties",
  "open_houses",
  "showings",
  "open_house_visitors",
  "follow_up_drafts",
  "feedback_requests",
  "open_house_host_invites",
  "contacts",
  "seller_reports",
  "transactions",
  "commissions",
  "deals",
] as const;

export async function GET(req: NextRequest) {
  const secret = process.env.RLS_DIAGNOSTICS_SECRET;
  if (!secret) return new NextResponse("Not found", { status: 404 });

  const provided = req.headers.get("x-rls-diagnostics");
  if (!provided || provided !== secret) {
    return NextResponse.json({ error: { message: "Forbidden" } }, { status: 403 });
  }

  const inList = TABLES_TO_INSPECT.map((t) => `'${t}'`).join(", ");

  // Note: Postgres `current_setting(key, true)` returns NULL when missing.
  const identityRows = await prisma.$queryRawUnsafe<
    Array<{
      current_user: string;
      session_user: string;
      rolbypassrls: boolean | null;
      rolsuper: boolean | null;
      jwt_sub: string | null;
      jwt_claims: string | null;
    }>
  >(
    `
      select
        current_user as current_user,
        session_user as session_user,
        (select rolbypassrls from pg_roles where rolname = current_user) as rolbypassrls,
        (select rolsuper from pg_roles where rolname = current_user) as rolsuper,
        current_setting('request.jwt.claim.sub', true) as jwt_sub,
        current_setting('request.jwt.claims', true) as jwt_claims
    `
  );

  const identity = identityRows[0] ?? null;

  let authUid: unknown = null;
  try {
    // Supabase provides auth.uid(). On plain Postgres this might not exist.
    const rows = await prisma.$queryRawUnsafe<
      Array<{ auth_uid: string | null }>
    >(`select auth.uid() as auth_uid`);
    authUid = rows?.[0]?.auth_uid ?? null;
  } catch {
    authUid = null;
  }

  const rlsRows = await prisma.$queryRawUnsafe<
    Array<{ tablename: string; relrowsecurity: boolean }>
  >(
    `
      select c.relname as tablename, c.relrowsecurity
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname in (${inList})
    `
  );

  const policyRows = await prisma.$queryRawUnsafe<
    Array<{
      tablename: string;
      polname: string;
      roles: string[] | null;
      cmd: string;
      qual: string | null;
      with_check: string | null;
    }>
  >(
    `
      select
        tablename,
        polname,
        roles,
        cmd,
        qual,
        with_check
      from pg_policies
      where schemaname = 'public'
        and tablename in (${inList})
      order by tablename, polname
    `
  );

  return NextResponse.json({
    data: {
      identity,
      authUid,
      rls: rlsRows.reduce<Record<string, boolean>>((acc, r) => {
        acc[r.tablename] = !!r.relrowsecurity;
        return acc;
      }, {}),
      policies: policyRows,
    },
  });
}

