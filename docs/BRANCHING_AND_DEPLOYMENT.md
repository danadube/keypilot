# KeyPilot Branching & Deployment

---

## Rules

1. **Never commit directly to `main`** — main is production
2. **One branch per feature or fix**
3. **Preview validation is required before merging** — for DB changes, this is non-negotiable
4. **All DB migrations must be applied to preview first**
5. **Always have a rollback plan** — document it in the PR

---

## Standard Workflow

```bash
# 1. Create a branch
git checkout -b feature/my-feature

# 2. Work, commit often
git commit -m "feature: describe the change"

# 3. Push
git push origin feature/my-feature

# 4. Open PR → preview deployment triggered automatically by Vercel
# 5. Validate in preview (see below)
# 6. Merge → production deploys automatically
```

---

## Branch Naming

| Prefix | Use for |
|--------|---------|
| `feature/` | New functionality |
| `fix/` | Bug fixes |
| `chore/` | Migrations, tooling, config |
| `docs/` | Documentation only |
| `refactor/` | Code changes with no behavior change |

---

## Commit Message Format

```
<prefix>: short description

prefix options:
  feature:   new functionality
  fix:       bug fix
  ui:        visual or UX change
  refactor:  internal restructure, no behavior change
  chore:     migrations, tooling, config, cleanup
  docs:      documentation only
  test:      adding or fixing tests
```

---

## Preview Validation Checklist

Before merging any PR, verify in the Vercel preview deployment:

### Always
- [ ] App loads without errors
- [ ] No console errors in key flows
- [ ] Build passes (`npm run build`)
- [ ] Tests pass (`npm test`)

### For DB / RLS changes
- [ ] Migrations applied to preview Supabase project
- [ ] Validation script run and all assertions pass
- [ ] Affected routes tested manually (create, read, cross-user block)
- [ ] Rollback SQL documented in the migration file header

### For new routes
- [ ] Route returns correct data for authenticated user
- [ ] Route returns 404 (not 500 or data leak) for cross-user access attempts
- [ ] `withRLSContext` used for all user-scoped queries
- [ ] Any `prismaAdmin` usage is justified in a comment

---

## RLS Deployment Rules

RLS migrations must follow this order **in every preview validation**:

1. Apply grants migration (`GRANT ... TO keypilot_app`)
2. Apply RLS migration (`ENABLE ROW LEVEL SECURITY` + policies)
3. Run validation script via Supabase MCP or direct SQL
4. Verify expected pass count matches actual
5. Smoke test the affected UI flows

**Never apply RLS migrations to production without first passing on preview.**

Rollback SQL is always in the migration file header. Example:
```sql
-- ─── ROLLBACK ────────────────────────────────────────────────────────────
--   ALTER TABLE public."transactions" DISABLE ROW LEVEL SECURITY;
--   DROP POLICY IF EXISTS transactions_select_own ON public."transactions";
--   REVOKE SELECT, INSERT, UPDATE, DELETE ON public."transactions" FROM keypilot_app;
```

---

## Mental Model

```
main          →  production (Vercel + Supabase production)
branch        →  development (local)
Vercel preview →  testing (Supabase preview)
merge to main  →  release
```

Migrations in `supabase/migrations/` are applied automatically by Supabase when linked to the project. Always confirm migration state in the Supabase dashboard after merging.

---

## Emergency Rollback

If a production issue is discovered after merge:

1. **Revert the PR** on GitHub (creates a revert PR automatically)
2. Merge the revert PR → Vercel redeploys previous build
3. If DB migration was applied: run the rollback SQL from the migration header against production Supabase
4. Validate production is stable before investigating the root cause

**Never run `DROP TABLE` or destructive SQL on production without a backup confirmation.**
