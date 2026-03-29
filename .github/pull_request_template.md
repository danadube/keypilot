# Summary

Describe what this PR changes in KeyPilot.

## Type of change
- [ ] Feature
- [ ] Bug fix
- [ ] Refactor
- [ ] RLS hardening / DB migration
- [ ] Documentation
- [ ] Prisma safe/admin usage refactor
- [ ] Other

---

### Database and RLS checklist (required if this PR changes the database)

_If this PR adds or modifies tables, columns, RLS, or grants, complete every item. **If this is not checked, the PR should not be merged.** See `docs/platform/database-migrations.md`._

- [ ] Prisma migration includes **all** required schema changes
- [ ] RLS policies + **GRANT**s for `keypilot_app` are included in **Prisma** migrations (not only `supabase/migrations`)
- [ ] `npx prisma migrate deploy` successfully applies everything locally (or against a preview DB)
- [ ] Feature works **without** manual SQL steps after deploy
- [ ] Dashboard / critical surfaces **degrade gracefully** if an **additive** query fails (`try/catch`, **logged** error, safe empty fallback)
- [ ] `npm run validate:db-safety` passes locally (CI **DB safety** workflow must be green for DB-related PRs)

---

## Product roadmap checklist

_When merging to `main`, update **`docs/product/KEYPILOT_MASTER_ROADMAP.md`** in this PR or in a fast-follow commit._

- [ ] I have reviewed `docs/product/KEYPILOT_MASTER_ROADMAP.md`
- [ ] I have updated it to reflect any changes in this PR (or N/A — docs-only / trivial)
- [ ] New features are listed under **Completed / Shipped** (or N/A)
- [ ] New issues / follow-ups are added to the correct section (or N/A)

---

# Why this change is needed

Explain:
- what problem it solves or risk it reduces
- what behavior it protects
- whether it affects future development safety

---

# Files / Areas Changed

List major files or directories touched.

---

# RLS Safety Checklist

_Skip sections that don't apply. Delete this block entirely for non-DB PRs._

## Required for all user-scoped routes
- [ ] All user-scoped reads use `withRLSContext`
- [ ] No unintended `prismaAdmin` (BYPASSRLS) usage
- [ ] Existing RLS policies unchanged unless intentional
- [ ] No public routes broken

## If this PR adds new tables or policies
- [ ] Migration applied to preview before merge
- [ ] RLS validation script updated and passing
- [ ] `keypilot_app` **GRANT**s and RLS policies are in **Prisma** migrations per `docs/platform/database-migrations.md` (Supabase-only is not sufficient for runtime)
- [ ] Rollback SQL documented in migration header

## If this PR adds new routes
- [ ] Route uses `withRLSContext` for user-scoped reads/writes
- [ ] Any `prismaAdmin` usage is commented with the reason
- [ ] FK ownership validated through RLS (not app-layer only)

## If this PR adds isolation tests
- [ ] Tests run against preview DB (not mocked)
- [ ] Cross-user access returns 404, not data
- [ ] `afterAll` cleans up seeded data

---

# Validation

- [ ] `npm run build` passes
- [ ] `npm test` passes (if tests exist for this area)
- [ ] Preview deployment verified
- [ ] No regressions in affected routes

---

# Rollback Plan

- Revert this PR
- Redeploy previous Vercel build
- If DB migration: run rollback SQL from migration header
