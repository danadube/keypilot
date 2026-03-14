# KeyPilot AI Assistant Architecture

## Overview

The AI Assistant acts as an **intelligence layer** across the KeyPilot platform. It does not replace the module system but augments it with summaries, suggestions, drafts, and prioritization—all subject to user review.

**Integration order:** Google first; Microsoft second; Apple/standards-based after.

---

## Architecture Layers

### 1. Data Layer

Sources and stores data from connected accounts and KeyPilot modules.

| Source | Provider | Services |
|--------|----------|----------|
| Google | `google` | Gmail, Google Calendar |
| Microsoft | `microsoft` | Outlook Mail, Outlook Calendar |
| Apple / Standards | `apple` | IMAP (Mail), CalDAV (Calendar), CardDAV (Contacts) |

**Data Objects:**
- `ConnectedAccount` — OAuth/credential handle for a user's external account
- `ExternalEmailThread` — Raw email thread from Gmail/Outlook/IMAP
- `ExternalCalendarEvent` — Event from Google Calendar/Outlook/CalDAV
- `KeyPilotEntity` — Property, OpenHouse, Contact, etc. (existing)

---

### 2. Intelligence Layer

AI processing on top of data. Produces summaries, scores, suggestions, drafts.

**AI Objects:**
- `AiSummary` — Short AI-generated summary (email, thread, briefing)
- `AiPriorityScore` — Numeric or categorical priority (email, task)
- `AiTaskSuggestion` — Suggested action derived from email, calendar, lead, follow-up
- `AiReplyDraft` — AI-generated reply text (not sent until user approves)
- `AiActionSuggestion` — Suggested action (e.g., "Schedule follow-up", "Add to CRM")
- `AiDailyBriefing` — Aggregated daily view: priorities, tasks, calendar, emails
- `AiEntityLink` — Links an external item (email, event) to a KeyPilot entity (contact, property)

**Processing Flow:**
1. Ingest external data (sync from Gmail, Calendar)
2. Run AI pipelines (summarize, score, suggest)
3. Store outputs with references to source data
4. Surface via Workflow and Experience layers

---

### 3. Workflow Layer

Orchestrates flows: sync triggers, AI processing triggers, user action handling.

**Responsibilities:**
- Trigger sync when connections are active
- Run AI pipelines after sync or on demand
- Enforce Trust Model (no auto-send, no auto-actions)
- Route user approvals (e.g., "Send reply", "Create task") back to appropriate modules

---

### 4. Experience Layer

UI surfaces for AI outputs. Uses existing design system and app shell.

**Home Page Sections:**
- Today's Calendar (KeyPilot + external events)
- AI To-Do List (AiTaskSuggestion)
- Priority Emails (ExternalEmailThread + AiSummary + AiPriorityScore)
- Recent Activity (existing)
- Quick Actions (existing)
- Module cards (existing)

**Module Integration:**
- ClientKeep: AiEntityLink to Contact
- ShowingHQ: AiTaskSuggestion for showings
- PropertyVault: AiActionSuggestion for listings

---

## AI Objects (Type Definitions)

See `lib/ai/types.ts` for full TypeScript definitions.

| Object | Purpose |
|--------|---------|
| `ConnectedAccount` | Links user to external provider (Connection model) |
| `ExternalEmailThread` | Email thread from Gmail/Outlook/IMAP |
| `ExternalCalendarEvent` | Calendar event from Google/Outlook/CalDAV |
| `AiSummary` | 1–2 sentence summary of an email or entity |
| `AiTaskSuggestion` | Task inferred from email, calendar, lead, follow-up |
| `AiReplyDraft` | Draft reply body; user reviews before send |
| `AiPriorityScore` | Priority score for email or task |
| `AiActionSuggestion` | Suggested next action (create task, link contact, etc.) |
| `AiDailyBriefing` | Daily aggregated view for Home |
| `AiEntityLink` | Link from external item to KeyPilot entity |

---

## Connections

Supported via Settings → Connections:

| Provider | Email | Calendar | Contacts |
|----------|-------|----------|----------|
| Google | Gmail | Google Calendar | — |
| Microsoft | Outlook Mail | Outlook Calendar | — |
| Apple | IMAP | CalDAV | CardDAV |

Future integrations plug in by:
1. Adding provider/service to `lib/connections.ts`
2. Implementing sync adapter (fetch emails, events, contacts)
3. Feeding normalized data into Intelligence layer
4. AI pipelines consume normalized types (`ExternalEmailThread`, `ExternalCalendarEvent`)

---

## Trust Model (Phase 1)

**AI may:**
- Summarize emails and threads
- Suggest tasks and actions
- Draft replies
- Score and prioritize items

**AI may NOT:**
- Send emails automatically
- Execute actions without explicit user approval
- Create/modify KeyPilot entities without user confirmation
- Sync without user-initiated connection

All AI outputs are **suggestions**. User must review and approve before any external or internal mutation.

---

## Home Integration

The Home page surfaces AI outputs via existing sections:

| Section | Data Source | AI Objects Used |
|---------|-------------|-----------------|
| Today's Calendar | KeyPilot events + external calendar | ExternalCalendarEvent |
| AI To-Do List | Email, calendar, showings, leads, follow-ups | AiTaskSuggestion |
| Priority Emails | Gmail/Outlook/IMAP | ExternalEmailThread, AiSummary, AiPriorityScore |
| Recent Activity | KeyPilot | (existing) |
| Quick Actions | — | (existing) |
| Modules | — | (existing) |

---

## Plug-In Points for Integrations

### Adding a New Email Provider

1. Register in `lib/connections.ts` (provider, service, config)
2. Implement sync adapter that returns `ExternalEmailThread[]`
3. Run existing AI pipelines (summarize, score) on normalized threads
4. Store in provider-agnostic tables; Home consumes same shapes

### Adding a New Calendar Provider

1. Register in Connections
2. Implement sync adapter → `ExternalCalendarEvent[]`
3. Merge with KeyPilot events for Today's Calendar
4. Feed into AiTaskSuggestion pipeline for deadlines

### Adding a New AI Capability

1. Define output type in `lib/ai/types.ts`
2. Add pipeline interface in `lib/ai/interfaces.ts`
3. Implement pipeline (LLM calls, rules)
4. Surface in Workflow layer and Experience layer (Home or module)

---

## Recommended Next Step: Google Integration

1. **OAuth** — Implement Google OAuth for Gmail and Calendar (Settings → Connections)
2. **Sync Adapters** — Fetch threads (Gmail API) and events (Calendar API); normalize to `ExternalEmailThread` and `ExternalCalendarEvent`
3. **AI Pipelines** — Wire LLM for summarize, score, suggest (use `lib/ai/interfaces.ts` contracts)
4. **Home API** — Extend `/api/v1/dashboard/*` or add `/api/v1/ai/*` to return AiDailyBriefing, Priority Emails, AI To-Do
5. **Trust** — Ensure all outputs are read-only suggestions; no auto-send
