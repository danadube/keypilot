
# KeyPilot Current Development State

## Current Phase
Phase 1 complete; Phase 2 (ClientKeep) foundation in place

## Primary Goal
Build Open House Lead Capture System

## Completed

- Initial architecture planning
- Technology stack decisions
- Repository setup instructions
- AI development context system
- Prisma database schema (all domain models, enums, indexes)
- Clerk auth + user webhook synchronization
- Property CRUD API
- Open house CRUD API
- Visitor sign-in system (tablet + QR, public `/oh/[slug]` page)
- Contact deduplication logic (email, then normalized phone)
- Follow-up draft generation
- Follow-up email send (Resend integration)
- Seller summary report
- PDF export (Download PDF on report page)
- Activity timeline
- Dashboard UI (properties, open houses, visitors, follow-ups, report)
- Unit tests (slugify, visitor, property validations)
- Integration tests (visitor-signin, by-slug, QR sign-in flow)
- Loading/error states (LoadingSpinner, ErrorMessage, retry)
- API error sanitization (lib/api-response.ts, no internal error leakage)
- Phase 2 foundation: Contact.status, Contact.assignedToUserId, EMAIL_SENT activity, status UI
- Contact notes: POST /api/v1/contacts/[id]/notes, quick-add form on ContactDetail
- ClientKeep UI: assign-to-me, activity type labels, contacts status filter, GET /api/v1/me
- Phase 2 future: ContactTag, FollowUpReminder, log call/email (CALL_LOGGED, EMAIL_LOGGED)

## In Progress

- None

## Next Planned Development Steps

1. ~~Integration tests for core flows~~ ✅ Done – visitor-signin + open-house by-slug (9 tests)
2. ~~Production hardening (API error handling)~~ ✅ Done – apiErrorFromCaught, no internal error leakage
3. ~~QR flow end-to-end verification~~ ✅ Done – lib/qr.test.ts + qr-sign-in-flow integration tests
4. ~~Phase 2 prep (ClientKeep / CRM layer)~~ ✅ Done – design doc, schema (status, assignedTo), EMAIL_SENT activity, status UI

## Recent

- **ADR-0002** – Single app with product-tier gating (accepted)
- **Product tier** – `ProductTier` enum on User (OPEN_HOUSE, FULL_CRM); OPEN_HOUSE users see minimal contact list; FULL_CRM users get status, tags, notes, reminders, log call/email

## Notes

Architecture must remain modular to allow future modules including:

FarmTrackr  
ClientKeep  
DealForge  
InsightDeck  
AutoPilot
