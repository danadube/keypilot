# Phase 2: ClientKeep (CRM Layer) – Design

## Overview

ClientKeep extends KeyPilot with contact CRM capabilities: communication timeline, relationship tracking, and follow-up automation. It builds on the existing Contact, Activity, and FollowUpDraft models from Phase 1.

## Goals

- **Communication timeline**: Unified view of all interactions (sign-ins, emails sent, notes, calls)
- **Relationship tracking**: Contact status, assignment, tags
- **Follow-up automation**: Scheduled reminders, drip sequences (future)

---

## Schema Additions (Phase 2)

### Contact

| Field | Type | Purpose |
|-------|------|---------|
| `status` | `ContactStatus?` | Pipeline stage: LEAD, CONTACTED, NURTURING, READY, LOST |
| `assignedToUserId` | `String?` (FK User) | Agent ownership for follow-up |

### ActivityType (extend enum)

| Value | Purpose |
|-------|---------|
| `EMAIL_SENT` | Follow-up email sent via Resend |

### Implemented

- ~~`ContactTag`~~ ✅ Tag model, ContactTag junction, add/remove tags on contact
- ~~`FollowUpReminder`~~ ✅ Reminder model with dueAt, body, status (PENDING/DONE/DISMISSED)
- ~~`Communication`~~ ✅ ActivityType CALL_LOGGED, EMAIL_LOGGED - manual log call/email

---

## API Additions

| Route | Method | Purpose |
|-------|--------|---------|
| `PATCH /api/v1/contacts/[id]` | PATCH | Update status, assignedTo (extend existing PUT) |
| `POST /api/v1/contacts/[id]/notes` | POST | Add manual note (creates Activity) |

---

## UI Additions

- ~~Contact list: status badge, assigned agent~~ ✅
- ~~Contact detail: status dropdown, assign-to selector~~ ✅ (Assign to me / Unassign)
- ~~Activity timeline: show EMAIL_SENT events with subject~~ ✅ (type labels)
- ~~Notes: quick-add note form~~ ✅
- ~~Contacts list filter by status~~ ✅

---

## Implementation Order

1. ~~**Schema**: Add `ContactStatus` enum, `Contact.status`, `Contact.assignedToUserId`~~
2. ~~**Activity**: Add `EMAIL_SENT` to ActivityType; log when follow-up sent~~
3. ~~**API**: Extend contact update for status/assignment~~
4. ~~**UI**: Status badge on contact list; status/assign on detail page~~
5. ~~**Notes**: Add note API + UI~~ – `POST /api/v1/contacts/[id]/notes`, quick-add form on ContactDetail

---

## Dependencies

- Phase 1 complete (Contact, Activity, FollowUpDraft, visitor sign-in)
- No new external services for MVP
