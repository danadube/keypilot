# KeyPilot Setup Guide

This guide walks you through setting up KeyPilot: creating a GitHub repository, connecting to Vercel for deployment, and configuring Supabase for the database.

---

## Table of Contents

1. [GitHub Repository](#1-github-repository)
2. [Supabase Database](#2-supabase-database)
3. [Clerk Authentication](#3-clerk-authentication)
4. [Vercel Deployment](#4-vercel-deployment)
5. [Environment Variables Checklist](#5-environment-variables-checklist)

---

## 1. GitHub Repository

### Create a new repository

1. Go to [GitHub](https://github.com) and sign in.
2. Click the **+** icon in the top-right → **New repository**.
3. Fill in the details:
   - **Repository name:** `KeyPilot` (or `keypilot`)
   - **Description:** `Modular real estate operations SaaS platform – Open House Lead Capture`
   - **Visibility:** Private (recommended) or Public
   - **Do not** initialize with a README (you already have one)
   - Add `.gitignore` template: **Node** (optional; project already has one)
4. Click **Create repository**.

### Push your local project

```bash
# From the KeyPilot project directory
cd /Users/danadube/Documents/-CODE_PROJECTS/KeyPilot

# Initialize git (if not already done)
git init

# Add all files
git add .

# First commit
git commit -m "Phase A: Initial scaffold - Next.js, Prisma, Clerk, API routes, page shells"

# Add GitHub as remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/KeyPilot.git

# Push to main
git branch -M main
git push -u origin main
```

### Optional: Repository settings

- **About:** Edit and add a URL and topics (e.g. `nextjs`, `real-estate`, `saas`).
- **Settings → General → Features:** Enable Issues and Discussions if you use them.
- **Branches:** Add branch protection for `main` if needed.

---

## 2. Supabase Database

### Create a Supabase project

1. Go to [Supabase](https://supabase.com) and sign in (or create an account).
2. Click **New Project**.
3. Fill in:
   - **Name:** `keypilot` (or your choice)
   - **Database Password:** Generate a strong password and store it securely
   - **Region:** Choose closest to your users
4. Click **Create new project** and wait for setup.

### Get your connection strings

1. In the Supabase dashboard, go to **Project Settings** (gear icon) → **Database**.
2. Copy these values:

   | Variable | Where to find |
   |----------|---------------|
   | `DATABASE_URL` | **Connection string** → **URI** (use "Transaction pooler" for serverless) |
   | `DIRECT_URL` | **Connection string** → **URI** (use "Session pooler" or "Direct connection") |

3. For Vercel/serverless, use the **Transaction pooler** URL for `DATABASE_URL` (port 6543) and the **Session/Direct** URL for `DIRECT_URL` (port 5432).

   Example format:
   ```
   DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
   DIRECT_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
   ```

### Run migrations

```bash
# Install dependencies (if not already done)
npm install

# Push the Prisma schema to Supabase
npx prisma db push

# Or, for versioned migrations (recommended for production)
npx prisma migrate dev --name init
```

---

## 3. Clerk Authentication

### Create a Clerk application

1. Go to [Clerk](https://clerk.com) and sign in (or create an account).
2. Click **Add application**.
3. Choose **Email** (and optionally **Google** or other providers).
4. Name it `KeyPilot` and create it.

### Get API keys

1. In the Clerk dashboard, go to **API Keys**.
2. Copy:
   - **Publishable key** → `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - **Secret key** → `CLERK_SECRET_KEY`

### Configure webhook (syncs users to your DB)

1. In Clerk, go to **Webhooks** → **Add Endpoint**.
2. **Endpoint URL:**  
   - Local: `https://your-ngrok-url.ngrok.io/api/v1/auth/webhook` (or similar tunnel)  
   - Production: `https://your-app.vercel.app/api/v1/auth/webhook`
3. Subscribe to: **User created**, **User updated**.
4. Copy the **Signing secret** → `CLERK_WEBHOOK_SECRET` (starts with `whsec_`).

> **Note:** For local webhook testing, use [ngrok](https://ngrok.com) or [localtunnel](https://localtunnel.github.io/www/).

---

## 4. Vercel Deployment

### Connect your GitHub repo

1. Go to [Vercel](https://vercel.com) and sign in with GitHub.
2. Click **Add New** → **Project**.
3. Import your **KeyPilot** (or `keypilot`) repository.
4. Vercel will detect Next.js automatically. Click **Deploy** (you can adjust settings later).

### Configure environment variables

1. In your Vercel project, go to **Settings** → **Environment Variables**.
2. Add these for **Production**, **Preview**, and **Development**:

   | Name | Value | Notes |
   |-----|-------|-------|
   | `DATABASE_URL` | From Supabase (Transaction pooler) | Pooled connection |
   | `DIRECT_URL` | From Supabase (Direct) | For migrations |
   | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | From Clerk | Publishable key |
   | `CLERK_SECRET_KEY` | From Clerk | Secret key |
   | `CLERK_WEBHOOK_SECRET` | From Clerk webhook | Signing secret |
   | `NEXT_PUBLIC_APP_URL` | `https://your-project.vercel.app` | Your Vercel URL |

3. **Important:** Set `NEXT_PUBLIC_APP_URL` to your actual Vercel domain (e.g. `https://keypilot-xxx.vercel.app`).

### Update Clerk and Webhook URLs

1. **Clerk Dashboard → Paths:**  
   - Sign-in: `/sign-in`  
   - Sign-up: `/sign-up`  
   - After sign-in: `/`

2. **Clerk Dashboard → Domains:**  
   Add your Vercel domain (e.g. `keypilot-xxx.vercel.app`).

3. **Clerk Webhook:**  
   - Use production URL: `https://your-app.vercel.app/api/v1/auth/webhook`

### Redeploy

After adding environment variables, go to **Deployments** → **⋮** on the latest deployment → **Redeploy**.

---

## 5. Environment Variables Checklist

### Local (.env.local)

Create `.env.local` in the project root:

```env
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Vercel (Settings → Environment Variables)

Same variables as above, with `NEXT_PUBLIC_APP_URL` set to your production URL.

---

## Quick Start Summary

| Step | Action |
|------|--------|
| 1 | Create GitHub repo → push code |
| 2 | Create Supabase project → get `DATABASE_URL` + `DIRECT_URL` → run `npx prisma db push` |
| 3 | Create Clerk app → get keys → create webhook |
| 4 | Import repo in Vercel → add env vars → deploy |
| 5 | Update Clerk domains and webhook URL to production |

---

## Troubleshooting

- **Database connection errors:** Ensure `DIRECT_URL` uses port 5432 and `DATABASE_URL` uses 6543 with `?pgbouncer=true` for serverless.
- **Clerk "User not found":** Make sure the Clerk webhook is firing and hitting `/api/v1/auth/webhook`; check that `CLERK_WEBHOOK_SECRET` is correct.
- **Vercel build fails:** Confirm all env vars are set and that `npx prisma generate` runs (it’s in `postinstall`).
- **Redirect loop:** Check Clerk path and domain settings and that `NEXT_PUBLIC_APP_URL` matches your app URL.
