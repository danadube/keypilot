# KeyPilot Database Schema

## Entity Relationship Overview

```
User 1──* Property
User 1──* OpenHouse
Property 1──* OpenHouse
OpenHouse 1──* OpenHouseVisitor *──1 Contact
OpenHouse 1──* FollowUpDraft *──1 Contact
OpenHouse 1──* SellerReport
OpenHouse 1──* Activity
Contact 1──* Activity
Property 1──* Activity
```

## Core Models

### User

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| clerkId | string | Unique, from Clerk |
| name | string | |
| email | string | Unique |
| role | string | Default: "agent" |
| createdAt, updatedAt | DateTime | |

### Property

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| address1, address2 | string | |
| city, state, zip | string | |
| listingPrice | Decimal? | |
| notes | string? | |
| createdByUserId | uuid | FK → User |
| deletedAt | DateTime? | Soft delete |

### Contact

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| firstName, lastName | string | |
| email, phone | string? | Dedupe keys |
| hasAgent | boolean? | Represented buyer? |
| timeline, notes | string? | |
| source | string | Default: "Open House" |
| deletedAt | DateTime? | Soft delete |

### OpenHouse

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| propertyId | uuid | FK → Property |
| hostUserId | uuid | FK → User |
| title | string | |
| startAt, endAt | DateTime | |
| qrSlug | string | Unique, 8-char |
| status | enum | DRAFT, SCHEDULED, ACTIVE, COMPLETED, CANCELLED |
| deletedAt | DateTime? | Soft delete |

### OpenHouseVisitor

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| openHouseId | uuid | FK → OpenHouse |
| contactId | uuid | FK → Contact |
| signInMethod | enum | TABLET, QR, MANUAL |
| submittedAt | DateTime | |

### FollowUpDraft

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| contactId, openHouseId | uuid | FK |
| subject, body | string | Email draft |
| status | enum | DRAFT, REVIEWED, SENT_MANUAL, ARCHIVED |
| deletedAt | DateTime? | Soft delete |

### Activity

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| contactId?, propertyId?, openHouseId? | uuid? | Optional FKs |
| activityType | enum | OPEN_HOUSE_CREATED, VISITOR_SIGNED_IN, etc. |
| body | string | Human-readable description |
| occurredAt | DateTime | |

### SellerReport

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| openHouseId | uuid | FK → OpenHouse |
| generatedByUserId | uuid | FK → User |
| reportJson | Json | Metrics snapshot |
