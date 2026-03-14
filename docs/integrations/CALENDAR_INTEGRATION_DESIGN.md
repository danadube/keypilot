# KeyPilot Calendar Integration Design

## Overview

KeyPilot's Home calendar will unify events from **Google Calendar** and **KeyPilot-generated events** (showings, open houses, tasks, deadlines, reminders). This document defines the calendar integration architecture.

**Integration order:** Google Calendar first; Outlook/Microsoft 365 calendar support planned for later.

---

## Event Sources

| Source            | Type        | Description                              | Color |
|-------------------|-------------|------------------------------------------|-------|
| ShowingHQ         | showing     | Scheduled property showings              | Blue  |
| PropertyVault     | open_house  | Open houses                              | Green |
| TaskPilot         | task        | Deadlines, follow-ups                    | Orange|
| Campaigns         | campaign    | FarmTrackr mailings, report deadlines     | Purple|
| Google Calendar   | meeting     | Synced meetings, appointments             | Gray  |
| Reminders         | reminder    | User-set or AI reminders                 | Accent|

---

## Core Capabilities

### 1. Google Calendar Sync

- **OAuth 2.0** via Google OAuth
- Scopes: `https://www.googleapis.com/auth/calendar.readonly`, optionally `calendar.events` for creating events
- Sync primary calendar; support multiple calendars (user config)
- Incremental sync via `syncToken` from Calendar API
- Map Google events → KeyPilot `CalendarEvent` with `source: "google"`

### 2. KeyPilot-Generated Events

- **Showings:** From ShowingHQ (future) or PropertyVault open houses
- **Open houses:** From PropertyVault/OpenHouse entities
- **Tasks:** From TaskPilot deadlines
- **Campaigns:** FarmTrackr drops, report due dates
- **Reminders:** User-created or AI-suggested

### 3. Unified Calendar Display

- Merge all sources by `startAt` for Today's Calendar
- Deduplication: Same logical event (e.g. open house) not shown twice
- Event source indicator in UI (badge or icon)
- Click-through to source (open house detail, task, Gmail thread, etc.)

---

## Data Model (Conceptual)

```
CalendarEvent (unified)
  - id, userId
  - title, startAt, endAt?, meta?
  - type: showing | open_house | task | campaign | meeting | reminder
  - source: keypilot | google
  - sourceId? (e.g. openHouseId, googleEventId)
  - href? (deep link)
  - calendarId? (for Google multi-calendar)
```

---

## API Surface (KeyPilot Backend)

| Endpoint                             | Purpose                            |
|-------------------------------------|------------------------------------|
| `POST /api/v1/integrations/calendar/connect` | Initiate Google OAuth             |
| `GET /api/v1/integrations/calendar/status`   | Check connection status           |
| `GET /api/v1/dashboard/calendar-events`     | Unified events (today + week)     |
| `POST /api/v1/integrations/calendar/sync`    | Trigger Google Calendar sync      |

---

## Home Calendar Widget Behavior

- **Week strip:** Mon–Sun, current week; today highlighted
- **Event list:** Selected day's events, sorted by time
- **Event row:** Left border color by type; title, time, meta; link when applicable
- **Empty state:** "Connect Google Calendar" CTA when no events
- **Source badge:** Optional "Google" or "KeyPilot" badge per event

---

## Security & Privacy

- OAuth tokens stored encrypted
- Sync only event metadata (title, time, location); no full descriptions unless needed
- User can disconnect calendar from settings
- Respect Google API rate limits

---

## Outlook / Microsoft 365 Calendar (Future)

- Microsoft Graph `/me/calendar/events`
- Same unified `CalendarEvent` shape
- Provider abstraction in backend (`CalendarProvider` interface)
