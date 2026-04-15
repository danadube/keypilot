# KeyPilot – What You Need to Do Next

> **April 2026 — onboarding note:** This file is a **short personal checklist** style guide. **Canonical setup** (Supabase, Clerk, Vercel, env vars, checkpoints) lives in **[`docs/SETUP.md`](SETUP.md)**. **Product priorities** live in **[`docs/product/KEYPILOT_MASTER_ROADMAP.md`](product/KEYPILOT_MASTER_ROADMAP.md)**. Prefer those for “source of truth”; keep this file for a quick linear list if you still find it useful.

---

Here’s what’s done and what’s left.

---

## Done for you

- Supabase `DATABASE_URL` and `DIRECT_URL` set in `.env` and `.env.local`
- `.env` added to `.gitignore` (credentials stay local)
- Database connection configured for Prisma

---

## Your 3 tasks

### 1. Create tables (run this in your terminal)

From your KeyPilot repo root (directory containing `package.json`):

```bash
cd /path/to/your/keypilot
npx prisma db push
```

You should see: `Your database is now in sync with your schema.`

---

### 2. Set up Clerk and add keys

1. Go to [clerk.com](https://clerk.com) → sign in with GitHub.
2. Click **Add application** → name it `KeyPilot` → enable **Email** → **Create**.
3. Go to **Configure** → **API Keys**.
4. Copy the **Publishable key** (starts with `pk_test_`).
5. Copy the **Secret key** (starts with `sk_test_`).
6. Add both keys to `.env.local` yourself, or share them through your team’s secure channel if someone else manages your env files.

---

### 3. Set up Vercel and deploy

1. Go to [vercel.com](https://vercel.com) → **Add New** → **Project**.
2. Import `danadube/keypilot` from GitHub.
3. Before deploying, add these **Environment Variables** (for Production, Preview, Development):
   - `DATABASE_URL` – copy from your `.env.local`
   - `DIRECT_URL` – copy from your `.env.local`
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` – from Clerk
   - `CLERK_SECRET_KEY` – from Clerk
   - `CLERK_WEBHOOK_SECRET` – leave empty for now
   - `NEXT_PUBLIC_APP_URL` – use `https://keypilot.vercel.app` as a placeholder
4. Click **Deploy**.
5. After the first deploy, copy your real URL (e.g. `https://keypilot-xyz.vercel.app`).
6. In Vercel: **Settings** → **Environment Variables** → edit `NEXT_PUBLIC_APP_URL` to that URL.
7. **Deployments** → three dots on latest → **Redeploy**.

---

## Then: Clerk webhook (after Vercel is live)

1. In Clerk → **Webhooks** → **Add Endpoint**.
2. **Endpoint URL:** `https://YOUR-VERCEL-URL/api/v1/auth/webhook`
3. **Subscribe to:** `user.created`, `user.updated` → **Create**.
4. Copy the **Signing secret** (`whsec_...`).
5. In Vercel → **Environment Variables** → add `CLERK_WEBHOOK_SECRET` with that value.
6. Redeploy again.
7. In Clerk → **Configure** → **Domains** → add your Vercel URL.

---

## Quick checklist

| Step | Task | Status |
|------|------|--------|
| 1 | Run `npx prisma db push` | You do this |
| 2 | Create Clerk app, add keys to `.env.local` | You do this |
| 3 | Import repo on Vercel, add env vars, deploy | You do this |
| 4 | Add Clerk webhook, add secret to Vercel, redeploy | You do this |

---

## Test locally after Clerk keys are set

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → sign up at `/sign-up`. You should see the Clerk form (you may see “User not found” until the webhook is set up in production).
