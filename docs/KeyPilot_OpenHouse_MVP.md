# KeyPilot Open House MVP

## Scope

The MVP covers the full open house lead capture workflow:

1. **Properties** — Add and manage listing addresses
2. **Open Houses** — Schedule events, get unique QR slugs
3. **Visitor Sign-In** — Public form at `/oh/[slug]` for visitors
4. **Visitors List** — View who signed in per open house
5. **Follow-Up Drafts** — Generate email drafts for new visitors
6. **Seller Report** — Metrics snapshot for listing agents

## User Flows

### Agent Flow

1. Sign up / sign in (Clerk)
2. Add property (address, city, state, zip)
3. Create open house (property, title, start/end)
4. Share QR code or link (`/oh/[slug]`) at the event
5. View visitors list
6. Generate follow-up drafts for visitors without drafts
7. Generate seller report after event

### Visitor Flow

1. Scan QR or open link at open house
2. Enter name, email or phone, agent status, notes
3. Submit — creates/updates contact, links to open house
4. See thank-you confirmation

## Key Features

- **Contact deduplication** — Match by email or phone (never by name alone)
- **QR slug** — 8-character unique slug per open house
- **Activity timeline** — Events per contact and open house
- **Soft deletes** — Property, Contact, OpenHouse, FollowUpDraft
