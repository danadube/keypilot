# KeyPilot – Step-by-Step Setup Guide

Follow these steps in order. Each section ends with a "✓ Checkpoint" so you know you’re on the right track.

---

## Overview

You will set up:

1. **Supabase** – PostgreSQL database
2. **Clerk** – Authentication (sign-in, users)
3. **Vercel** – Hosting and deployment
4. **Clerk Webhook** – Syncs Clerk users to your database

**Time:** ~20–30 minutes  
**Prerequisites:** GitHub repo with KeyPilot code (already done)

---

# Step 1: Supabase (Database)

### 1.1 Create account / sign in

1. Open **[supabase.com](https://supabase.com)**
2. Click **Start your project** (or **Sign in** if you have an account)
3. Sign in with GitHub (recommended for integration with Vercel)

---

### 1.2 Create a new project

1. On the Supabase dashboard, click **"New Project"** (green button, top-right or center).
2. A form appears with fields:
   - **Name:** Type `keypilot` (lowercase, no spaces).
   - **Database Password:** Click **"Generate a password"** — a random password appears. Click **Copy** and save it in Notes or a password manager. You cannot view it again.
   - **Region:** Use the dropdown. Choose the region closest to you (e.g. "East US (North Virginia)" or "West EU (Ireland)").
3. Click **"Create new project"** at the bottom.
4. Wait 1–2 minutes. A loading spinner or progress bar indicates setup. Do not close the tab.

**✓ Checkpoint:** You see a dashboard with a sidebar: Table Editor, SQL Editor, API, etc.

---

### 1.3 Get connection strings

**Use the Connect button (easiest):**
1. Stay on your project’s **home page** (the main dashboard after opening the project).
2. Look for a **Connect** button — it’s usually at the **top** of the page or in a prominent card.
3. Click **Connect**. A panel opens showing connection methods (URI, Transaction, Session, etc.).
4. *If you don’t see Connect:* Go directly to `https://supabase.com/dashboard/project/YOUR-PROJECT-REF/settings/database` — replace `YOUR-PROJECT-REF` with the ID from your project URL (e.g. `abcdefghijklmnop`).

**Choose Transaction mode (for DATABASE_URL):**
7. In the Connection string section, you may see a **dropdown** or **tabs**. Select **URI** (not JDBC, DotNet, or Go).
8. Look for a **mode selector**: it may say "Transaction" / "Session" / "Direct", or "Supavisor" with "Transaction" vs "Session".
9. Select **Transaction** (or "Transaction mode" / "Pooler transaction"). This uses port **6543**.
10. A connection string appears in a code block. It will contain `[YOUR-PASSWORD]` as a placeholder.
11. Click the **Copy** button (icon of two overlapping squares) next to the string.
12. Paste into a text editor. The string looks like: `postgresql://postgres.[ref]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres`
13. Replace `[YOUR-PASSWORD]` with the database password you copied in Step 1.2.
14. Add `?pgbouncer=true` at the very end (e.g. `...postgres?pgbouncer=true`).
15. This final string is your **`DATABASE_URL`** — save it.

**Choose Session mode (for DIRECT_URL):**
16. Switch the mode selector to **Session** (or "Session mode" / "Pooler session" / "Direct").
17. Click **Copy** again.
18. Paste into your editor. It will use port **5432** (not 6543). Do **not** add `?pgbouncer=true`.
19. Replace `[YOUR-PASSWORD]` with your database password.
20. This is your **`DIRECT_URL`** — save it.

**✓ Checkpoint:** You have two URLs: one ending with `:6543/postgres?pgbouncer=true` (DATABASE_URL) and one ending with `:5432/postgres` (DIRECT_URL).

---

### 1.4 Create tables in the database

**Prepare your project:**
1. Open Terminal (Mac) or Command Prompt / PowerShell (Windows).
2. Navigate to your KeyPilot folder:  
   `cd /Users/danadube/Documents/-CODE_PROJECTS/KeyPilot`
3. If `.env.local` doesn’t exist, create it:  
   `touch .env.local`
4. Open `.env.local` in your editor (VS Code, Cursor, etc.).
5. Add or replace with these lines (use your real values from Steps 1.3 and 2.3):

   ```env
   DATABASE_URL="postgresql://postgres.[ref]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
   DIRECT_URL="postgresql://postgres.[ref]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:5432/postgres"
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_
   CLERK_SECRET_KEY=sk_test_
   CLERK_WEBHOOK_SECRET=whsec_
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

6. Run in your terminal:  
   `npx prisma db push`

7. You should see: `Your database is now in sync with your schema.`

**✓ Checkpoint:** In Supabase → **Table Editor**, you see tables like `users`, `properties`, `contacts`, `open_houses`, etc.

---

# Step 2: Clerk (Authentication)

### 2.1 Create account / sign in

1. Open **[clerk.com](https://clerk.com)**
2. Click **Start building for free** or **Sign in**
3. Sign in with GitHub (recommended)

---

### 2.2 Create an application

1. In the Clerk dashboard, click **Add application** (or **Create application**)
2. **Application name:** `KeyPilot`
3. Choose sign-in options (at least one required):
   - **Email** – recommended, enable it
   - **Google**, **GitHub**, etc. – optional
4. Click **Create application**
5. You’ll be taken to the application dashboard

**✓ Checkpoint:** You’re in the KeyPilot application in Clerk.

---

### 2.3 Get API keys

**Navigate to API Keys:**
1. In the **left sidebar**, look for **"Configure"** (or "Configuration"). Click it.
2. In the submenu, click **"API Keys"**.  
   - *Alternate path:* Some Clerk layouts have **"API Keys"** directly in the sidebar—click it.
3. You should land on a page titled something like "API Keys" or "Keys".
4. You’ll see two keys:
   - **Publishable key** – a long string starting with `pk_test_` (dev) or `pk_live_` (prod). Safe to expose in frontend.
   - **Secret key** – a long string starting with `sk_test_` or `sk_live_`. Never expose publicly.
5. Each key has a **Copy** button (clipboard icon). Click **Copy** for each and paste into a secure note:
   - Publishable key → `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - Secret key → `CLERK_SECRET_KEY`
4. Update your `.env.local` with these values

**✓ Checkpoint:** `.env.local` contains valid `pk_test_` and `sk_test_` (or `pk_live_` / `sk_live_`) values.

---

### 2.4 Configure paths (for sign-in / sign-up URLs)

1. In Clerk sidebar, go to **Customization** → **Paths** (or **Configure** → **Paths**)
2. Set:
   - **Sign-in URL:** `/sign-in`
   - **Sign-up URL:** `/sign-up`
   - **After sign-in URL:** `/`
   - **After sign-up URL:** `/`
3. Save if there’s a **Save** button

**✓ Checkpoint:** Paths are set to match your Next.js routes.

---

### 2.5 Test Clerk locally (optional)

1. Ensure `.env.local` has valid Clerk keys
2. Run:

   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000)
4. Go to `/sign-in` – you should see the Clerk sign-in form
5. Create a test user (email + password)

**Note:** Until the webhook is configured, signing in will show “User not found” in the app because the user isn’t in your database yet. That’s expected. The webhook will fix this once Vercel is deployed.

---

# Step 3: Vercel (Hosting)

### 3.1 Sign in and import the project

**Sign in:**
1. Open **[vercel.com](https://vercel.com)** in your browser.
2. In the top-right, click **"Log in"** or **"Sign up"**.
3. Choose **"Continue with GitHub"** (not Email or GitLab).
4. If prompted, authorize Vercel to access your GitHub account. Click **"Authorize Vercel"** or similar.

**Import the repo:**
5. You’ll land on the Vercel dashboard (a grid of projects, or an empty state).
6. Click the **"Add New…"** button (top-right). A dropdown opens.
7. Click **"Project"** (not "Storage" or "Edge Config").
8. You’ll see **"Import Git Repository"** with a list of your GitHub repos.
9. Type **"keypilot"** in the search box if it’s not visible, or scroll to find **danadube/keypilot**.
10. Next to the repo, click **"Import"** (blue button).

**✓ Checkpoint:** You see the project configuration screen (Framework preset, Root Directory, Build settings).

---

### 3.2 Configure build settings

1. **Framework Preset:** Next.js (should be auto-detected)
2. **Root Directory:** leave as `.` (project root)
3. **Build and Output Settings:** defaults are fine

**Do not deploy yet.** Add environment variables first.

---

### 3.3 Add environment variables

**Open the env vars section:**
1. On the project configuration page, scroll down to **"Environment Variables"**.
2. Click to **expand** it if it’s collapsed (click the row or a down arrow).
3. You’ll see an empty table or "No environment variables" plus an **"Add"** or **"Add New"** button.

**Add each variable:**
4. Click **"Add"** (or "Add New" / the **+** icon).
5. A form appears with: **Name**, **Value**, and **Environments** (checkboxes).
6. Add these one by one:

   | Name | Value | Environments |
   |------|-------|--------------|
   | `DATABASE_URL` | Your Supabase URI (port 6543, `?pgbouncer=true`) | Production, Preview, Development |
   | `DIRECT_URL` | Your Supabase direct URI (port 5432) | Production, Preview, Development |
   | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Your Clerk publishable key (`pk_test_` or `pk_live_`) | Production, Preview, Development |
   | `CLERK_SECRET_KEY` | Your Clerk secret key (`sk_test_` or `sk_live_`) | Production, Preview, Development |
   | `CLERK_WEBHOOK_SECRET` | Leave empty for now – you’ll add it in Step 4 | Production, Preview, Development |
   | `NEXT_PUBLIC_APP_URL` | Use a placeholder for now, e.g. `https://keypilot.vercel.app` – we’ll fix it after deploy | Production, Preview, Development |

7. For each variable:
   - In **Name**, type the exact variable name (e.g. `DATABASE_URL`).
   - In **Value**, paste your actual value (no quotes needed).
   - Under **Environments**, check **Production**, **Preview**, and **Development** (all three).
   - Click **"Add"** or the checkmark (✓) to save.
   - Repeat for the next variable.
8. When all 6 variables are added, scroll to the bottom and click **"Deploy"** (large button).

**✓ Checkpoint:** Build starts. You’ll get a URL like `https://keypilot-xxx.vercel.app` when it finishes.

---

### 3.4 Update NEXT_PUBLIC_APP_URL

1. Wait for the first deployment to finish
2. Copy your deployment URL (e.g. `https://keypilot-xyz123.vercel.app`)
3. In Vercel: **Settings** → **Environment Variables**
4. Find `NEXT_PUBLIC_APP_URL` and edit it
5. Set the value to your actual deployment URL
6. Redeploy: **Deployments** → three dots on the latest → **Redeploy**

**✓ Checkpoint:** `NEXT_PUBLIC_APP_URL` matches your live Vercel URL.

---

# Step 4: Clerk Webhook (Sync users to database)

### 4.1 Create the webhook in Clerk

**Navigate to Webhooks:**
1. Go to **[dashboard.clerk.com](https://dashboard.clerk.com)** and ensure you’re in your KeyPilot application.
2. In the left sidebar, click **"Webhooks"** (may be under "Configure" → "Webhooks").
3. Click **"Add Endpoint"** (or "+ Add endpoint").
4. A form appears. In **"Endpoint URL"**, paste:
   - Example: `https://keypilot-xyz123.vercel.app/api/v1/auth/webhook`
5. Under **"Subscribe to events"** or **"Events"**, check the boxes for:
   - **user.created**
   - **user.updated**  
   (You may need to click "Select events" or expand a list first.)
6. Click **"Create"** or **"Add endpoint"**.
7. After creation, the page shows the new endpoint. Find **"Signing secret"** – it starts with `whsec_`.
8. Click **"Reveal"** if it’s hidden, then click **"Copy"** to copy it. Save it somewhere safe.

**✓ Checkpoint:** You have a webhook URL and a signing secret (`whsec_...`).

---

### 4.2 Add CLERK_WEBHOOK_SECRET to Vercel

1. Go to **Vercel** → your KeyPilot project
2. **Settings** → **Environment Variables**
3. Find `CLERK_WEBHOOK_SECRET`
4. If it’s empty, edit it and paste the signing secret
5. If it doesn’t exist, add:
   - **Name:** `CLERK_WEBHOOK_SECRET`
   - **Value:** `whsec_...` (from Clerk)
   - **Environments:** Production, Preview, Development
6. Save
7. Go to **Deployments** → three dots on the latest → **Redeploy**

**✓ Checkpoint:** Webhook secret is in Vercel and a redeploy has completed.

---

### 4.3 Add your Vercel domain to Clerk

1. In Clerk, go to **Configure** → **Domains** (or **Paths and Domains**)
2. Under **Allowed redirect URLs** or **Authorized domains**, add:
   - `https://keypilot-xxx.vercel.app` (or your real Vercel URL)
   - `https://keypilot-xxx.vercel.app/*` (if needed)
3. Save

**✓ Checkpoint:** Clerk knows about your production domain.

---

# Step 5: Verify everything

### 5.1 Test production deployment

1. Open your Vercel URL: `https://keypilot-xxx.vercel.app`
2. You should see the KeyPilot dashboard (or a redirect to sign-in)
3. Click **Sign Up** (or go to `/sign-up`)
4. Create a new account with an email and password
5. After signing up, you should be redirected to the dashboard

**✓ Checkpoint:** You can sign up, sign in, and see the dashboard.

---

### 5.2 Confirm user sync to database

1. In **Supabase** → **Table Editor** → open the `users` table
2. You should see a row for the user you just created

**✓ Checkpoint:** The `users` table has your new user.

---

### 5.3 Test local development

1. Ensure `.env.local` has all variables (including `CLERK_WEBHOOK_SECRET` if you’re testing webhooks locally with a tunnel)
2. Run:

   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000)
4. Sign in with the account you created – it should work if the webhook ran in production

**✓ Checkpoint:** Local dev works with the same credentials.

---

# Environment variables summary

### Required for local development (.env.local)

```env
DATABASE_URL="postgresql://postgres.[ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:5432/postgres"
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx
CLERK_WEBHOOK_SECRET=whsec_xxxxx
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Required for Vercel (production)

| Variable | Where to get it |
|----------|-----------------|
| `DATABASE_URL` | Supabase → Settings → Database → URI (Transaction, port 6543, `?pgbouncer=true`) |
| `DIRECT_URL` | Supabase → Settings → Database → URI (Session, port 5432) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk → API Keys → Publishable key |
| `CLERK_SECRET_KEY` | Clerk → API Keys → Secret key |
| `CLERK_WEBHOOK_SECRET` | Clerk → Webhooks → Endpoint → Signing secret |
| `NEXT_PUBLIC_APP_URL` | Your Vercel deployment URL (e.g. `https://keypilot-xxx.vercel.app`) |

---

# Optional: Resend (Email sending)

To enable **Send email** on follow-up drafts:

1. Sign up at [resend.com](https://resend.com)
2. Get your API key from **API Keys**
3. Add to `.env.local` and Vercel:
   - `RESEND_API_KEY=re_xxxxx`
   - `RESEND_FROM_EMAIL=you@yourdomain.com` (optional; defaults to `onboarding@resend.dev` for testing)

**Note:** Production emails require a verified domain in Resend.

---

# Optional: Property lookup (RentCast + MLS)

## RentCast (by address)

[RentCast](https://rentcast.io) provides property data by address – 50 free API calls/month. Works for any US address.

1. Sign up at [app.rentcast.io](https://app.rentcast.io) → get your API key from the API dashboard.
2. Add to `.env.local` and Vercel: `RENTCAST_API_KEY=your_key`
3. On the Add property form, enter a full address (e.g. `123 Main St, Palm Desert, CA 92260`) and click **By address**.

## MLS (by MLS number)

To **auto-populate property by MLS number** on the Add property form:

1. Obtain API access from your MLS provider (RESO, Bridge, Trestle, etc.)
2. Add to `.env.local` and Vercel:
   - `MLS_LOOKUP_API_URL` – Your MLS provider’s property lookup endpoint (e.g. `https://api.example.com/property`)
   - `MLS_LOOKUP_API_KEY` – API key for that service
3. Your API should accept `?mls=12345678` and return JSON: `{ address1, address2?, city, state, zip, listingPrice? }`

Without these env vars, the Lookup button shows "MLS lookup is not configured" – you can still add properties manually.

### Flexmls (Coachella Valley, CA)

**Flexmls** in Coachella Valley uses the **Spark Platform** (sparkplatform.com). To integrate:

1. **Get API access**
   - Contact your MLS (CDAR – California Desert Association of Realtors) or your broker
   - Request Spark API access – you’ll need OAuth 2 credentials (Client ID, Client Secret)
   - Docs: [sparkplatform.com/docs](https://sparkplatform.com/docs), [How to Set Up API Access](https://sparkplatform.com/docs/overview/set_up_access)

2. **Spark specifics**
   - Listings search: `GET /listings` with `_filter=ListingKey Eq 'MLS_NUMBER'` (field names may vary by board)
   - OAuth 2 is required – a simple Bearer API key is not enough
   - You may need a proxy or server-side token flow

3. **KeyPilot integration**
   - Option A: Use a **bridge service** – a small service that has Spark OAuth set up and exposes a simple `?mls=XXX` endpoint; point `MLS_LOOKUP_API_URL` at it
   - Option B: Add a **Flexmls/Spark adapter** – implement OAuth token refresh and Spark Listings API in `lib/mls-lookup.ts` (requires `SPARK_CLIENT_ID`, `SPARK_CLIENT_SECRET`, `SPARK_REFRESH_TOKEN` or similar)

Until that’s set up, continue adding properties manually or via the generic `MLS_LOOKUP_API_URL` if your MLS provides a simpler REST API.

---

# Troubleshooting

| Problem | What to check |
|---------|----------------|
| **Vercel build fails** | All 6 env vars set? `postinstall` runs `prisma generate` – no DB needed for that. |
| **"User not found" after sign-in** | Clerk webhook URL correct? `CLERK_WEBHOOK_SECRET` set in Vercel? Try signing up again after fixing. |
| **Database connection error** | `DATABASE_URL` uses port 6543 and `?pgbouncer=true`. `DIRECT_URL` uses port 5432. Password correct and URL-encoded? |
| **`prisma db push` fails with "prepared statement already exists"** | Use **Session** mode (port 5432) for `DIRECT_URL`, not Transaction (6543). `prisma.config.ts` prefers `DIRECT_URL` for schema ops. If it still fails, run `npm run db:push:direct`. See [Supabase Prisma troubleshooting](https://supabase.com/docs/guides/database/prisma/prisma-troubleshooting). |
| **Redirect loop on sign-in** | Clerk domain added? `NEXT_PUBLIC_APP_URL` matches your Vercel URL? |
| **Webhook not firing** | Endpoint is `https://your-domain.vercel.app/api/v1/auth/webhook`. Check Clerk → Webhooks → Recent deliveries for errors. |
| **Webhook returns 500 "Base64Coder"** | `CLERK_WEBHOOK_SECRET` is malformed. **Fix:** Clerk → Webhooks → endpoint → Signing secret → **Regenerate** → copy. Vercel → env vars → replace `CLERK_WEBHOOK_SECRET` (no spaces) → Redeploy. |

---

# Quick reference

| Step | Action |
|------|--------|
| 1 | Supabase: create project → get `DATABASE_URL` & `DIRECT_URL` → `npx prisma db push` |
| 2 | Clerk: create app → get API keys → configure paths |
| 3 | Vercel: import repo → add env vars → deploy |
| 4 | Clerk: create webhook → add `CLERK_WEBHOOK_SECRET` to Vercel → redeploy |
| 5 | Verify: sign up, check `users` table in Supabase |
