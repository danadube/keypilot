# KeyPilot Connections Architecture

## Overview

The Connections system under Settings provides a platform-level integration layer for external services. It supports connecting, managing status, viewing last sync time, and disconnecting accounts—without implementing full syncing yet.

## Supported Services

### Google
- **Gmail** — Email intelligence, priority inbox, AI summaries
- **Google Calendar** — Sync meetings, showings, deadlines

### Microsoft
- **Outlook Mail** — Email intelligence and priority inbox
- **Outlook Calendar** — Sync meetings and events

### Apple / Standards-based
- **Apple Mail** — IMAP email sync
- **Apple Calendar** — CalDAV calendar sync
- **Apple Contacts** — CardDAV contact sync

## Future Features (Architecture Ready)

- Calendar sync
- Email intelligence
- Contact sync
- Task suggestions
- AI daily briefing

## Data Model

- **Connection** — userId, provider, service, status, lastSyncAt, connectedAt, errorMessage
- **Status**: DISCONNECTED | CONNECTED | PENDING | ERROR

## API

- `GET /api/v1/settings/connections` — List all connection states
- `DELETE /api/v1/settings/connections/[id]` — Disconnect

## UI

- **Settings** → **Connections** tab
- Grouped by provider (Google, Microsoft, Apple)
- Each service: Connect / Disconnect, status badge, last sync time
