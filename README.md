# KeyPilot

A modular real estate operations SaaS platform for agents. Phase 1 focuses on **Open House Lead Capture**—capturing visitor sign-ins via QR code, managing follow-ups, and generating seller reports.

## Tech Stack

- **Framework:** Next.js 14 (App Router) + TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **Auth:** Clerk
- **Database:** Supabase (PostgreSQL) + Prisma ORM
- **Deploy:** Vercel

## Quick Start

```bash
npm install
cp .env.local.example .env.local   # Then fill in your secrets
npx prisma db push                  # Create database tables
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Setup Guide

**New to the project?** See **[docs/SETUP.md](docs/SETUP.md)** for a step-by-step walkthrough of:

1. Creating a GitHub repository
2. Setting up Supabase (database)
3. Setting up Vercel (deployment)
4. Configuring Clerk (authentication)
5. Environment variables

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (Supabase) |
| `DIRECT_URL` | Direct connection for migrations |
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
