# KeyPilot Project Overview

## Summary

KeyPilot is a modular real estate operations platform for agents. The first module is **Open House Lead Capture**.

## Vision

Enable real estate agents to:
- Capture visitor sign-ins at open houses via QR code
- Manage follow-up drafts for leads
- Generate seller reports for listing agents

## Current Phase

**Phase 1 MVP — Open House Lead Capture** (Complete)

- Properties management
- Open house scheduling with QR codes
- Public visitor sign-in form (`/oh/[slug]`)
- Visitor list and contact deduplication
- AI-generated follow-up drafts
- Seller report generation

## Future Modules (Planned)

- Listing management
- Transaction pipelines
- CRM integrations
- Calendar sync

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind, shadcn/ui |
| Backend | Next.js Route Handlers (REST API) |
| Database | PostgreSQL (Supabase) |
| ORM | Prisma |
| Auth | Clerk |
| Deploy | Vercel |
| Validation | Zod |

## Repository Structure

```
keypilot/
├── app/               # Next.js App Router
├── components/        # React components
├── lib/               # Business logic, validations, utilities
├── prisma/            # Schema and migrations
├── docs/              # Project documentation
└── scripts/           # CLI and automation scripts
```
