# KeyPilot Architecture

An overview of the architecture used in the KeyPilot repository.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT (Browser)                               │
└─────────────────────────────────────────────────────────────────────────┘
                    │
                    │  Next.js App Router (React Server Components)
                    │  - Pages under (dashboard), (auth), oh/[slug]
                    │  - Clerk for auth UI (SignIn, SignUp, UserButton)
                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      NEXT.JS (Vercel)                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────────┐   │
│  │  Middleware  │  │  App Router  │  │  API Routes (/api/v1/...)     │   │
│  │  (Clerk)     │  │  (Pages)     │  │  REST, JSON responses        │   │
│  └──────────────┘  └──────────────┘  └──────────────────────────────┘   │
│         │                   │                        │                  │
│         │                   │                        │                  │
│         ▼                   ▼                        ▼                  │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  lib/  - auth, db, validations, contact-dedupe, follow-up-template│   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
         │                        │                         │
         │                        │                         │
         ▼                        ▼                         ▼
┌──────────────┐          ┌──────────────┐          ┌──────────────┐
│    Clerk     │          │   Supabase   │          │   Clerk      │
│  (Auth)      │          │ (PostgreSQL) │          │  Webhooks    │
│  user.created│          │   Prisma     │          │  user.sync   │
└──────────────┘          └──────────────┘          └──────────────┘
```

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Framework** | Next.js 14 App Router | SSR, routing, API routes |
| **Language** | TypeScript | Type safety |
| **Styling** | Tailwind CSS + shadcn/ui | UI components |
| **Auth** | Clerk | Sign-in, sign-up, sessions |
| **Database** | Supabase (PostgreSQL) | Data persistence |
| **ORM** | Prisma | Type-safe DB access |
| **Validation** | Zod | Input validation |
| **Deploy** | Vercel | Hosting, edge/serverless |

---

## Folder Structure

```
keypilot/
├── app/                    # Next.js App Router
│   ├── (auth)/             # Route group – doesn't affect URL
│   │   ├── sign-in/[[...sign-in]]/   # Clerk catch-all sign-in
│   │   └── sign-up/[[...sign-up]]/   # Clerk catch-all sign-up
│   ├── (dashboard)/        # Route group – protected
│   │   ├── layout.tsx      # Sidebar + UserButton
│   │   ├── page.tsx        # Dashboard home (/)
│   │   ├── properties/     # /properties
│   │   ├── open-houses/    # /open-houses + sub-routes
│   │   ├── contacts/       # /contacts
│   │   └── settings/       # /settings
│   ├── oh/[slug]/          # Public QR sign-in page (no auth)
│   └── api/v1/             # REST API
│       ├── auth/webhook/   # Clerk webhook (user sync)
│       ├── properties/     # CRUD
│       ├── open-houses/    # CRUD + visitors, follow-ups, report
│       ├── visitor-signin/ # Public – visitor self-sign-in
│       ├── contacts/       # List, get, update, activities
│       └── follow-up-drafts/
├── components/             # React components (Phase B)
│   ├── ui/                 # shadcn components
│   ├── layout/
│   ├── properties/
│   ├── open-houses/
│   ├── visitors/
│   ├── follow-ups/
│   ├── reports/
│   └── shared/
├── lib/                    # Core logic (no UI)
│   ├── db.ts               # Prisma client singleton
│   ├── auth.ts             # getCurrentUser, getCurrentUserOrNull
│   ├── slugify.ts          # QR slug generation
│   ├── qr.ts               # QR code image generation
│   ├── follow-up-template.ts  # Email draft templates
│   ├── contact-dedupe.ts   # findOrCreateContact (email/phone)
│   └── validations/        # Zod schemas
├── prisma/
│   └── schema.prisma       # Data model
├── types/
│   └── index.ts            # Shared TypeScript types
├── hooks/                  # React hooks
└── middleware.ts           # Clerk auth (protect routes)
```

---

## Data Flow

### 1. Authentication

- **Clerk** handles sign-in/sign-up and sessions.
- **Clerk Webhook** (`/api/v1/auth/webhook`) receives `user.created` and `user.updated` events.
- Webhook creates/updates **User** records in Supabase.
- API routes call `getCurrentUser()` from `lib/auth.ts`, which uses Clerk's `userId` to look up the User in the DB.

### 2. Request Flow (Protected Routes)

```
Request → Middleware (Clerk) → auth().protect() → Page/API → getCurrentUser() → Prisma → Supabase
```

- Middleware runs on Node.js runtime (for Vercel compatibility).
- Public routes: `/oh/*`, `/api/v1/visitor-signin`, `/api/v1/auth/webhook`, `/sign-in`, `/sign-up`.

### 3. Visitor Sign-In (Public)

```
Visitor on /oh/[slug] → Form submit → POST /api/v1/visitor-signin
  → findOrCreateContact() (dedupe by email or phone)
  → Create OpenHouseVisitor
  → Create Activity (VISITOR_SIGNED_IN)
```

### 4. Contact Deduplication

All contact matching lives in `lib/contact-dedupe.ts`:

1. Match by **email** (exact, `deletedAt` null).
2. If no match, match by **normalized phone** (digits only).
3. If no match, create new contact.
4. Never match on name alone.

---

## API Design

- **Base path:** `/api/v1/`
- **Auth:** All routes except `/visitor-signin` and `/auth/webhook` require `getCurrentUser()`.
- **Response shape:**
  - Success: `{ data: ... }`
  - Error: `{ error: { message: string, code?: string } }`
- **Validation:** Zod before any DB access.
- **Scoping:** Queries filtered by `hostUserId` or `createdByUserId` (no cross-user data).

---

## Database Model (Core Entities)

| Model | Purpose |
|-------|---------|
| **User** | Synced from Clerk; owns properties, open houses |
| **Property** | Listing (address, city, state, zip) |
| **OpenHouse** | Event tied to property, has `qrSlug` for public URL |
| **Contact** | Lead (email, phone, notes); deduped |
| **OpenHouseVisitor** | Links Contact to OpenHouse (sign-in) |
| **FollowUpDraft** | Email draft per visitor |
| **Activity** | Timeline events (visitor signed in, report generated, etc.) |
| **SellerReport** | Snapshot of metrics (JSON) per open house |

**Soft deletes:** `Property`, `Contact`, `OpenHouse`, `FollowUpDraft` use `deletedAt`.

---

## Security

- **Clerk** for auth; no custom password handling.
- **User scoping** in all API routes.
- **Svix** for webhook signature verification.
- **Zod** validation on all inputs.
- **Soft deletes** to avoid hard deletes of related data.

---

## Deployment (Vercel)

- **Build:** `prisma generate && next build`
- **Runtime:** Node.js (middleware uses `runtime = "nodejs"`).
- **Env:** `DATABASE_URL`, `DIRECT_URL`, Clerk keys, `NEXT_PUBLIC_APP_URL`.

---

## Phase A vs Later Phases

| Phase | Scope |
|-------|-------|
| **A (current)** | Scaffold, API routes, page shells, auth, DB schema |
| **B** | UI components, forms, data fetching in pages |
| **C** | QR sign-in page, visitor flow |
| **D** | PDF export (@react-pdf/renderer) |
