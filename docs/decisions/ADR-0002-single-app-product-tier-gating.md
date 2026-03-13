# ADR 0002 — Single App with Product-Tier Gating

## Status
Accepted

## Date
2026-03-13

## Context

KeyPilot is being built as a modular real estate operations platform. The first deployable product is the **ShowingsHQ** module (lead capture & showing management), with future expansion into broader CRM capabilities such as ClientKeep, DealForge, InsightDeck, and AutoPilot.

A key architectural question was whether to:

1. Build separate products/apps for Open House and future CRM modules, or
2. Build a single application with shared data models and feature gating.

This decision matters because the Open House module already creates and depends on shared entities such as:

- Users
- Properties
- Contacts
- Activities
- FollowUpDrafts
- SellerReports

Future CRM modules will extend those same entities rather than replace them.

## Decision

KeyPilot will use a **single Next.js application** with **product-tier-based feature gating**.

We will **not** create separate codebases, separate apps, or a Turborepo at this stage.

Instead, we will:

- keep one shared codebase
- keep one shared database
- keep one shared set of core entities
- gate features, routes, and navigation based on product tier

### Product tiers for MVP

For Phase 1 and Phase 2, the platform will support at least these tiers:

- `OPEN_HOUSE`
- `FULL_CRM`

For MVP, product tier will be stored on the `User` model.

## Why this decision was made

### 1. Shared domain model
The Open House product creates contacts and activities that should later become part of the CRM. Splitting apps now would either duplicate logic or force a shared backend too early.

### 2. Lower implementation risk
A single app avoids:

- repo restructuring
- Turborepo setup
- multiple deployment pipelines
- duplicated auth and routing logic
- duplicated UI systems

### 3. Better product evolution
We can launch **ShowingsHQ** first, then expand users into **Full CRM** without rebuilding the system.

### 4. Easier go-to-market
Commercially, we can still sell:
- ShowingsHQ only
- Full CRM
- Future premium platform tiers

without changing the technical architecture.

## Technical implementation rules

### Application structure
- One Next.js application
- One Supabase PostgreSQL database
- One Prisma schema
- One Clerk auth integration

### Shared entities
These remain in the same codebase and database:

- `User`
- `Property`
- `Contact`
- `OpenHouse`
- `OpenHouseVisitor`
- `Activity`
- `FollowUpDraft`
- `SellerReport`

### Product access model
For MVP, product access will be stored on the `User` record using an enum.

Example:

```prisma
enum ProductTier {
  OPEN_HOUSE
  FULL_CRM
}
```

And on `User`:

```prisma
productTier ProductTier @default(OPEN_HOUSE)
```

### Gating approach
Feature access will be controlled by:

- navigation visibility
- route guards
- server-side authorization checks
- conditional UI rendering

### Temporary environment overrides
Environment variables such as `NEXT_PUBLIC_PRODUCT_TIER` may be used **only for local development, demos, or temporary preview behavior**.

They must **not** be the primary long-term access control mechanism.

## What OPEN_HOUSE tier includes

- Dashboard
- Properties
- Showings
- Visitor sign-in
- Follow-up drafts
- Seller reports
- Minimal contact visibility

## What FULL_CRM tier adds later

- richer contact management
- tags
- notes
- reminders
- communication history
- expanded activity timeline
- future CRM modules

## Consequences

### Positive
- fastest path to launch
- no premature platform complexity
- shared data model from day one
- easier future upsell from ShowingsHQ to CRM
- simpler deployment and maintenance

### Negative
- some future UI and routing logic will need careful gating
- multi-tenant org/account product gating may require moving tier from `User` to `Organization` later
- code discipline is required so future modules do not leak into lower tiers

## Deferred decisions

These are intentionally postponed:

- separate apps or domains
- Turborepo
- multiple deployment targets
- org-level subscription model
- separate release cadences per product

These should only be reconsidered if one or more of the following become true:

- different teams are building different products
- products require separate deployments
- products need different domains
- release cadence diverges significantly
- the codebase grows beyond what a single app can manage comfortably

## Summary

KeyPilot will remain a **single modular application**.

We will launch ShowingsHQ first and use **product-tier-based feature gating** to expose or hide future CRM capabilities. This keeps the architecture simple, scalable, and aligned with the shared data model we already designed.
