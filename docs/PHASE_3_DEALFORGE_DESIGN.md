# Phase 3: DealForge (Transaction Pipeline) – Design

## Overview

DealForge adds deal/transaction pipeline management to KeyPilot. Agents can track buyer interest in properties from first contact through closing.

## Goals

- **Deal pipeline**: Track contact + property combinations through stages
- **Offer comparison** (OfferScope): Compare multiple offers on a listing (future)
- **Transaction management** (CloseLine): Closing checklist, docs (future)

---

## Schema (Phase 3 MVP)

### Deal

| Field | Type | Purpose |
|-------|------|---------|
| `id` | UUID | Primary key |
| `contactId` | FK Contact | Buyer |
| `propertyId` | FK Property | Listing |
| `userId` | FK User | Agent owning the deal |
| `status` | DealStatus | Pipeline stage |
| `notes` | Text? | Deal notes |
| `offerPrice` | Decimal? | Current/best offer (future) |
| `createdAt`, `updatedAt` | DateTime | Timestamps |

### DealStatus enum

INTERESTED → SHOWING → OFFER → NEGOTIATION → UNDER_CONTRACT → CLOSED | LOST

---

## API

| Route | Method | Purpose |
|-------|--------|---------|
| `GET /api/v1/deals` | GET | List user's deals (filter by status) |
| `POST /api/v1/deals` | POST | Create deal (contactId, propertyId) |
| `GET /api/v1/deals/[id]` | GET | Deal detail |
| `PATCH /api/v1/deals/[id]` | PATCH | Update status, notes |

---

## UI

- Deals list (pipeline view or table)
- Deal detail page
- Create deal from contact or property
- Status dropdown to move through pipeline

---

## Access Control

- User sees deals where they own the property (createdByUserId) or the contact (via their open house visits)
- For simplicity: userId on Deal = agent who created it; they see only their deals
