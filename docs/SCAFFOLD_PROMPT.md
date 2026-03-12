# KeyPilot scaffold prompt

Use this prompt to bootstrap a fresh KeyPilot project from scratch.

> **Note:** This project is already built. Use only when starting a new repo or re-initializing.

---

Paste into Cursor at project root:

```
You are acting as a senior software engineer and repository architect.
We are creating a new SaaS project called KeyPilot.
KeyPilot is a modular real estate operations platform.
The first module is Open House Lead Capture.
Your job is to initialize a clean production-ready Git repository structure before any feature code is written.

Stack: Next.js 14 (App Router), TypeScript, Tailwind, shadcn/ui, Next.js Route Handlers, PostgreSQL (Supabase), Prisma, Clerk, Vercel, Zod, qrcode.

Create the folder structure:
- app/(auth)/sign-in, sign-up
- app/(dashboard)/layout, page, properties, open-houses, contacts, settings
- app/oh/[slug]
- app/api/v1/auth/webhook, properties, open-houses, visitor-signin, contacts, follow-ups, reports
- components/ui, layout, properties, open-houses, visitors, follow-ups, reports, shared
- lib/db, auth, qr, slugify, follow-up-template, validations
- prisma/schema, migrations
- hooks, types, scripts, public, styles
- docs/, .github/workflows/

Create .gitignore (Next.js + .env, .vercel, coverage, .DS_Store, .vscode).
Create .env.example with DATABASE_URL, DIRECT_URL, Clerk keys, NEXT_PUBLIC_APP_URL.
Create README with setup instructions.
Create .github/workflows/ci.yml (Node 20, lint, build).
Initialize Prisma (datasource only, no models).
Initialize Tailwind + shadcn/ui.
Add Clerk middleware skeleton.
Do NOT implement features yet.
```

---

## Next step

After scaffold completes:

```
Now generate the Prisma schema for the KeyPilot Open House MVP using the approved architecture.
```
