# KeyPilot

A modular real estate operations SaaS platform for agents. Phase 1 focuses on **Open House Lead Capture**—capturing visitor sign-ins via QR code, managing follow-ups, and generating seller reports.

**Product roadmap & priorities:** [`docs/product/KEYPILOT_MASTER_ROADMAP.md`](docs/product/KEYPILOT_MASTER_ROADMAP.md)

## Tech Stack

- **Framework:** Next.js 14 (App Router) + TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **Auth:** Clerk
- **Database:** Supabase (PostgreSQL) + Prisma ORM
- **Deploy:** Vercel

## Quick Start

```bash
npm install
cp .env.example .env.local        # Then fill in your secrets
npx prisma db push                  # Create database tables
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Setup Guide

Follow these steps in order. Full details: **[docs/SETUP.md](docs/SETUP.md)**.

---

### Step 1: Supabase (Database)

1. Go to [supabase.com](https://supabase.com) → **Start your project** → sign in with GitHub
2. Click **New Project**
   - **Name:** `keypilot`
   - **Database Password:** Click **Generate a password** → **Copy** and save it
   - **Region:** Choose closest to you
3. Click **Create new project** and wait 1–2 minutes
4. **Get connection strings** — use one of these:
   - **Option A:** On your project’s home page, click the **Connect** button (top of the page)
   - **Option B:** Use the **Connect** button on the project home page (top of main content) — skip Settings, connection strings are here
   - **Option C:** Go directly: `https://supabase.com/dashboard/project/YOUR-PROJECT-REF/settings/database`
5. **Transaction mode** (for `DATABASE_URL` — required on Vercel/serverless):
   - Select **Transaction** → Copy the URI (port **6543**)
   - Replace `[YOUR-PASSWORD]` with your password
   - Add `?pgbouncer=true&connection_limit=1` at the end → this is **`DATABASE_URL`**
   - **Do not** use **Session** mode or the **`:5432` pooler** URI for `DATABASE_URL` — you will hit `MaxClientsInSessionMode` under load.
6. **Direct connection** (for **`DIRECT_URL`** — Prisma migrate, `db push`, GitHub Actions):
   - In Database settings, use the **direct** URI (host **`db.<project-ref>.supabase.co`**, port **5432**), not the pooler host.
   - Session pooler (`*.pooler.supabase.com:5432`) is still a pooler and can hit **max clients** during migrate; see **`docs/platform/database-migrations.md`**.
7. In your project: add both URLs to `.env.local`, then run `npx prisma db push`

**✓ Checkpoint:** Supabase → Table Editor shows `users`, `properties`, etc.

---

### Step 2: Clerk (Authentication)

1. Go to [clerk.com](https://clerk.com) → **Start building** → sign in with GitHub
2. **Add application** → Name: `KeyPilot` → enable **Email** → **Create**
3. **Configure** → **API Keys**:
   - Copy **Publishable key** → `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - Copy **Secret key** → `CLERK_SECRET_KEY`
4. **Customization** → **Paths**: Sign-in: `/sign-in`, Sign-up: `/sign-up`, Home: `/`
5. Add both keys to `.env.local`

**✓ Checkpoint:** `npm run dev` → open `/sign-up` → Clerk sign-up form appears

---

### Step 3: Vercel (Hosting)

1. Go to [vercel.com](https://vercel.com) → **Add New** → **Project**
2. Import **danadube/keypilot** from GitHub
3. Before deploying, add **Environment Variables** (Production, Preview, Development):
   - `DATABASE_URL` (from Supabase)
   - `DIRECT_URL` (from Supabase)
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (from Clerk)
   - `CLERK_SECRET_KEY` (from Clerk)
   - `CLERK_WEBHOOK_SECRET` → leave empty for now
   - `NEXT_PUBLIC_APP_URL` → placeholder `https://keypilot.vercel.app`
4. Click **Deploy** → wait for build → copy your URL (e.g. `https://keypilot-xyz.vercel.app`)
5. **Settings** → **Environment Variables** → edit `NEXT_PUBLIC_APP_URL` to your real URL → **Redeploy**

**✓ Checkpoint:** Your app loads at the Vercel URL

---

### Step 4: Clerk Webhook (Sync users to DB)

1. In Clerk → **Webhooks** → **Add Endpoint**
2. **Endpoint URL:** `https://YOUR-VERCEL-URL.vercel.app/api/v1/auth/webhook`
3. **Subscribe to:** `user.created`, `user.updated` → **Create**
4. Copy **Signing secret** (`whsec_...`)
5. In Vercel → **Settings** → **Environment Variables** → add `CLERK_WEBHOOK_SECRET` with that value
6. **Deployments** → three dots → **Redeploy**
7. In Clerk → **Configure** → **Domains** → add your Vercel URL

**✓ Checkpoint:** Sign up on production → user appears in Supabase `users` table

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Supabase **transaction** pooler (`:6543`, `pgbouncer=true`; use `connection_limit=1` on Vercel) |
| `DIRECT_URL` | **Direct** Postgres (`db.*.supabase.co:5432`) for migrations — not a pooler URI |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `CLERK_WEBHOOK_SECRET` | Clerk webhook signing secret |
| `NEXT_PUBLIC_APP_URL` | Base URL (e.g. `https://yourapp.vercel.app`) |

## Scripts

| Command | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

## Project Structure

```
app/
├── (auth)/           # Sign-in, sign-up (Clerk)
├── (dashboard)/      # Authenticated app: properties, open houses, contacts
├── oh/[slug]         # Public QR sign-in page (no auth)
└── api/v1/           # REST API
```

## License

Private — All rights reserved.
