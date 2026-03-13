
# KeyPilot Architecture Rules

## Technology Stack

Frontend
- Next.js 14 App Router
- React
- TypeScript
- Tailwind CSS
- shadcn/ui

Backend
- Next.js Route Handlers (REST API)

Database
- PostgreSQL (Supabase)

ORM
- Prisma

Authentication
- Clerk

Validation
- Zod

Deployment
- Vercel

Utilities
- qrcode npm package

---

## Repository Structure

Single Next.js application repository.

Key directories:

app/  
components/  
lib/  
prisma/  
types/  
hooks/  
docs/

API routes must live under:

/app/api/v1/

Dashboard routes must live under:

/app/(dashboard)/

Public visitor sign-in page:

/app/oh/[slug]

---

## Core Domain Models

User  
Property  
OpenHouse  
Contact  
OpenHouseVisitor  
Activity  
FollowUpDraft  
SellerReport  

---

## Engineering Rules

• Database schema is the source of truth  
• All API inputs validated using Zod  
• Prisma handles all database access  
• Clerk middleware protects authenticated routes  
• Domain logic lives inside `/lib`  
• UI components must never directly access the database  

---

## Security Rules

Public routes allowed:

/oh/[slug]  
/api/v1/visitor-signin

All other routes require authentication.

Never trust client input.
