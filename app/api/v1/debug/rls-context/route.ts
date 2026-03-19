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
  const provided = req.headers.get("x-rls-diagnostics");
  const isLocalDebug = process.env.NODE_ENV !== "production";

  const secretPresent = Boolean(secret);
  const providedPresent = Boolean(provided);
  const match = Boolean(secretPresent && providedPresent && provided === secret);

  // Temporary local diagnostics: do not reveal the full secret.
  // Keep behavior unchanged otherwise (logging only).
  if (process.env.NODE_ENV !== "production") {
    // Mask by length to avoid leaking.
    // eslint-disable-next-line no-console
    console.debug("[rls-context guard]", {
      secretPresent,
      providedPresent,
      providedLen: provided?.length ?? 0,
      secretLen: secret?.length ?? 0,
      match,
    });
  }

  // Guard: missing env secret should only 404 in production.
  if (!secretPresent) {
    if (isLocalDebug) {
      // eslint-disable-next-line no-console
      console.warn("[rls-context guard] missing_env_secret", {
        nodeEnv: process.env.NODE_ENV,
        providedPresent,
        providedLen: provided?.length ?? 0,
      });
      return NextResponse.json(
        { error: { code: "missing_env_secret", message: "RLS_DIAGNOSTICS_SECRET is not set" } },
        { status: 404 }
      );
    }
    return new NextResponse("Not found", { status: 404 });
  }

  if (!providedPresent) {
    if (isLocalDebug) {
      // eslint-disable-next-line no-console
      console.warn("[rls-context guard] missing_header", {
        secretPresent,
        nodeEnv: process.env.NODE_ENV,
      });
      return NextResponse.json(
        { error: { code: "missing_header", message: "x-rls-diagnostics header is missing" } },
        { status: 403 }
      );
    }
    return NextResponse.json({ error: { message: "Forbidden" } }, { status: 403 });
  }

  if (!match) {
    if (isLocalDebug) {
      // eslint-disable-next-line no-console
      console.warn("[rls-context guard] header_mismatch", {
        secretPresent,
        providedPresent,
        providedLen: provided?.length ?? 0,
        secretLen: secret?.length ?? 0,
      });
      return NextResponse.json(
        { error: { code: "header_mismatch", message: "x-rls-diagnostics does not match" } },
        { status: 403 }
      );
    }
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
        policyname as polname,
        roles,
        cmd,
        qual,
        with_check
      from pg_policies
      where schemaname = 'public'
        and tablename in (${inList})
      order by tablename, policyname
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

