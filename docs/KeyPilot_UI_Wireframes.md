# KeyPilot UI Wireframes

High-level structure for the Open House Lead Capture MVP.

---

## App Structure

```
/                           → Dashboard home
/sign-in                    → Clerk sign-in
/sign-up                    → Clerk sign-up

/properties                 → Properties list
/properties/new             → Add property form
/properties/[id]            → Property detail + open houses

/open-houses                → Open houses list
/open-houses/new            → New open house form (select property, date/time)
/open-houses/[id]           → Open house detail (stats, QR code, links)
/open-houses/[id]/visitors  → Visitors table
/open-houses/[id]/follow-ups→ Follow-up drafts list + generate button
/open-houses/[id]/report    → Seller report (metrics, generate)
/open-houses/[id]/sign-in   → Tablet display (QR code for sign-in)

/contacts                   → Contacts list
/contacts/[id]              → Contact detail + activity timeline

/settings                   → Settings placeholder

/oh/[slug]                  → PUBLIC visitor sign-in form (no auth)
```

---

## Key Screens

### 1. Open House List
- Table: Event, Address, Date & Time, Visitors count, Status
- "New Open House" button
- Row link → detail

### 2. Open House Detail
- Title, address, date/time
- Stats: visitor count, agent breakdown, draft count
- QR code + shareable URL
- Links: Visitors, Follow-ups, Report, Sign-in (tablet)

### 3. Public Sign-In (`/oh/[slug]`)
- Property address
- Form: First name, Last name, Email, Phone (at least one required)
- Optional: Has agent?, Notes
- "Sign in" button

### 4. Visitors
- Table: Name, Email, Phone, Sign-in method, Time
- Link to contact detail

### 5. Follow-Ups
- "Generate drafts for new visitors" button
- Table: Contact, Subject, Status
- Link to contact

### 6. Seller Report
- "Generate report" button
- Metrics: Total visitors, With agent, Without, Unknown, Drafts created
- Visitor comments list
- Regenerate option
