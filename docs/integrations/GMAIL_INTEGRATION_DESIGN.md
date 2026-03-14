# KeyPilot Gmail Integration Design

## Overview

KeyPilot will integrate with Gmail (primary) and Microsoft Outlook/365 (future) to power an AI-driven daily operations workflow. This document defines the Gmail integration architecture, data flow, and feature set.

**Integration order:** Google first; Outlook/Microsoft 365 support planned for later.

---

## Core Capabilities

### 1. Inbox Reading

- **OAuth 2.0** via Google OAuth consent screen
- **Read-only** access: `gmail.readonly` and `gmail.modify` (for draft creation)
- Scopes: `https://www.googleapis.com/auth/gmail.readonly`, `https://www.googleapis.com/auth/gmail.compose`
- Sync strategy: Incremental sync via History API; initial fetch with pagination
- Rate limits: Respect Gmail API quotas (250 quota units/user/second)

### 2. Important Email Detection

- Use Gmail's native **Important** marker when available
- AI scoring for real-estate relevance:
  - Keywords: showing, offer, contract, inspection, closing, listing, buyer, seller
  - Sender domain recognition (known agents, title companies, lenders)
  - Thread engagement (replies, forwards)
- Surface high-priority emails in **Priority Emails** Home section

### 3. Email Categorization

AI-assisted categorization:

| Category        | Description                                           |
|----------------|-------------------------------------------------------|
| Needs Reply    | Action required; user has not replied                  |
| Informational  | FYI, updates, receipts                                |
| Waiting        | Awaiting response from another party                 |
| Lead / Inquiry | Potential lead or showing request                    |
| Transaction    | Contract, inspection, closing-related                |
| Marketing      | Newsletters, promotional (lower priority)           |

### 4. Summary Generation

- Per-email AI summary (1–2 sentences)
- Display in Priority Emails card
- Model: Use KeyPilot AI stack (configurable LLM)

### 5. Draft Replies

- Generate draft via Gmail API `drafts.create`
- User reviews and sends from Gmail or KeyPilot
- Track draft state: created, edited, sent

### 6. Task / Action Suggestions

- Derive tasks from email content:
  - "Reply to John about showing time"
  - "Schedule inspection follow-up"
  - "Send contract addendum to buyer"
- Surface in **AI To-Do List** on Home
- Link task → email thread for context

---

## Data Model (Conceptual)

```
EmailSync
  - id, userId, gmailMessageId, threadId
  - subject, snippet, from, to, date
  - important (bool), labels[]
  - aiSummary?, aiCategory?, aiNeedsReply (bool)
  - syncedAt, lastProcessedAt

EmailTask
  - id, emailSyncId, title, suggestedAction
  - status: suggested | created | completed
  - linkedToTaskPilotId?
```

---

## API Surface (KeyPilot Backend)

| Endpoint                    | Purpose                         |
|----------------------------|---------------------------------|
| `POST /api/v1/integrations/gmail/connect` | Initiate OAuth, store tokens  |
| `GET /api/v1/integrations/gmail/status`   | Check connection status       |
| `GET /api/v1/integrations/gmail/priority-emails` | Fetch priority emails (paginated) |
| `POST /api/v1/integrations/gmail/sync`    | Trigger incremental sync      |
| `POST /api/v1/integrations/gmail/draft`   | Create AI-generated draft     |
| `GET /api/v1/integrations/gmail/thread/:id` | Fetch thread for context    |

---

## Security & Privacy

- Store OAuth tokens encrypted at rest
- Refresh token rotation per Google best practices
- No raw email body stored long-term; snippets and AI outputs only
- User can revoke access from Google Account settings
- Scope minimal required permissions

---

## UI Integration Points

- **Home → Priority Emails:** List of emails with sender, subject, AI summary, status
- **Home → AI To-Do List:** Tasks derived from Gmail (source badge: "Email")
- **Quick Stats → Needs Reply:** Count of emails requiring reply
- Future: Dedicated Email/Inbox module or ClientKeep email view

---

## Outlook / Microsoft 365 (Future)

- Same UI surface; different provider adapter
- Microsoft Graph API for mail
- Shared types: `PriorityEmail`, `EmailTask`, `EmailStatus`
- Provider-agnostic service layer in backend
