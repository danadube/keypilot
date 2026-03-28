# KeyPilot Development Workflow

Concise rules for repository workflow, deployment safety, and AI/dev sessions.

---

## Core Rule: All Completed Code Changes Must End With

**Every completed task must end with:**

1. **Successful build** — `npm run build` (or `npm run validate`) must pass
2. **`git add .`** — Stage all changes
3. **`git commit`** — With a clear message (see prefixes below)
4. **`git push`** — Push to the remote

No work should be left only in local uncommitted state.

---

## Commit Message Prefixes

Use clear prefixes for commit messages:

| Prefix | Use for |
|--------|---------|
| `feature:` | New features, enhancements |
| `fix:` | Bug fixes |
| `ui:` | UI-only changes |
| `refactor:` | Code refactoring |
| `docs:` | Documentation only |
| `chore:` | Tooling, config, maintenance |

**Examples:**
- `feature: add visitor sign-in QR flow`
- `fix: correct contact dedupe by phone`
- `docs: add development workflow and deployment safety guidance`

---

## Task Completion Summary

After each task, summarize:

- **Files changed** — list of modified/created files
- **Build result** — pass or fail
- **Commit message** — what was committed
- **Push result** — success or error

---

## GitHub + Vercel Workflow

### Current Behavior

The repo may use `main` directly for small changes. This is documented; the preferred workflow below reduces deploy risk.

### Preferred Workflow (Safer)

1. **Work on a branch** — `git checkout -b feature/your-feature`
2. **Push the branch** — `git push -u origin feature/your-feature`
3. **Preview deploy** — Vercel auto-deploys previews for non-main branches
4. **Verify** — Open the preview URL, confirm the build works
5. **Merge when ready** — Open a PR, merge when build passes and review is satisfied

This keeps `main` cleaner and reduces the risk of broken production deploys.

### Recommended GitHub/Vercel Setup

Configure these manually when possible:

| Setting | Recommendation |
|---------|----------------|
| **Protected main branch** | Require PR reviews and/or status checks before merge |
| **Required build checks** | Add a status check (e.g. Vercel build) that must pass before merge |
| **Vercel preview deployments** | Enable preview deployments for all branches (default) |
| **Environment variables** | Configure in both `.env.local` (local) and Vercel project settings (deploy) |

See Vercel docs: [Environment Variables](https://vercel.com/docs/environment-variables), [Preview Deployments](https://vercel.com/docs/deployments/preview-deployments).

### Manual Configuration Checklist

Configure these in GitHub and Vercel when you have access:

- [ ] **GitHub:** Settings → Branches → Add rule for `main` → Require a pull request before merging
- [ ] **GitHub:** Require status checks to pass (e.g. Vercel build) before merge
- [ ] **Vercel:** Project Settings → Environment Variables → Add all required vars (match `.env.local`)
- [ ] **Vercel:** Confirm preview deployments are enabled (Settings → Git → Preview deployments)

### Supra Gmail import cron (ShowingHQ)

Production uses Vercel Cron (see root `vercel.json`) to call **GET** `/api/cron/supra-gmail-import` on a schedule (default: hourly). Vercel sends the `x-vercel-cron: 1` header, which the route accepts as authorization.

For **manual or external** triggers (e.g. a third-party scheduler), set **`CRON_SECRET`** in the Vercel environment and call the same URL with header `Authorization: Bearer <CRON_SECRET>`.

Deploy the **`supra_gmail_import_settings`** migration with `npx prisma migrate deploy` so per-user automation flags and last-run metadata persist.

---

## Validation Scripts

Before pushing, run:

```bash
npm run build    # Full build (Prisma + Next.js)
npm run lint     # ESLint
npm run typecheck # TypeScript check (no emit)
```

Or run all:

```bash
npm run validate
```

---

## Quick Reference

1. Implement the task
2. `npm run build` — fix any errors
3. `git add .`
4. `git commit -m "prefix: clear message"`
5. `git push`
