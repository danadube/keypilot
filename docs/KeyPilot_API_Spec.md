# KeyPilot API Specification

Base path: `/api/v1/`

All responses follow: `{ data: T }` (success) or `{ error: { message: string, code?: string } }` (error).

---

## Auth (Public)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/webhook` | Clerk signing secret | Sync users (user.created, user.updated) |

---

## Properties

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/properties` | List user's properties |
| POST | `/properties` | Create property |
| GET | `/properties/[id]` | Get property (with openHouses) |
| PUT | `/properties/[id]` | Update property |
| DELETE | `/properties/[id]` | Soft delete (if no active/scheduled OH) |

---

## Open Houses

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/open-houses` | List user's open houses (?status=) |
| POST | `/open-houses` | Create open house |
| GET | `/open-houses/[id]` | Get open house (with visitors, drafts, QR) |
| PUT | `/open-houses/[id]` | Update open house |
| DELETE | `/open-houses/[id]` | Cancel or soft delete |
| GET | `/open-houses/[id]/visitors` | List visitors |
| GET | `/open-houses/[id]/follow-ups` | List follow-up drafts |
| POST | `/open-houses/[id]/follow-ups/generate` | Generate drafts for new visitors |
| GET | `/open-houses/[id]/report` | Get latest seller report |
| POST | `/open-houses/[id]/report` | Generate seller report |
| GET | `/open-houses/by-slug/[slug]` | **Public** – get OH by QR slug |

---

## Visitor Sign-In (Public)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/visitor-signin` | Self-sign-in (openHouseId, firstName, lastName, email, phone, signInMethod, etc.) |

---

## Contacts

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/contacts` | List contacts (from user's OH visitors) |
| GET | `/contacts/[id]` | Get contact |
| PUT | `/contacts/[id]` | Update contact |
| GET | `/contacts/[id]/activities` | List activity timeline |

---

## Follow-Up Drafts

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/follow-up-drafts/[id]` | Get draft |
| PUT | `/follow-up-drafts/[id]` | Update draft (subject, body) |
| PATCH | `/follow-up-drafts/[id]/status` | Update status (DRAFT, REVIEWED, SENT_MANUAL, ARCHIVED) |
