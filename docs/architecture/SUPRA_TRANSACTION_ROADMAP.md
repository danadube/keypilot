# Supra Email Integration & Transaction Roadmap

Internal architecture notes for future implementation. **Do not implement fully yet.**

---

## 1. Supra Email Parsing Workflow

**Goal:** Parse Supra email notifications to extract showing data.

### Workflow Steps
1. **Ingest:** Receive Supra notification emails (e.g., showing confirmed, feedback requested)
2. **Parse:** Extract structured data:
   - Showing ID
   - Property address / MLS number
   - Agent / showing agent details
   - Date/time
   - Status (scheduled, completed, cancelled)
3. **Match:** Link to existing KeyPilot Property / OpenHouse records
4. **Store:** Create or update Activity, Showings records

### Integration Points
- Email connector (Gmail / OAuth) — reuse Connections architecture
- Webhook or polling for Supra-specific endpoints (if available)
- Parsing rules: regex, LLM extraction, or Supra API (if documented)

### Future Files
- `lib/integrations/supra/parser.ts` — email body parsing
- `lib/integrations/supra/types.ts` — Supra data shapes
- `app/api/v1/webhooks/supra/route.ts` — optional webhook receiver

---

## 2. Automatic Feedback Request Workflow

**Goal:** After a showing, automatically trigger feedback request emails.

### Workflow Steps
1. **Trigger:** Detect showing completion (Supra email, manual mark, or sync)
2. **Delay:** Optional delay (e.g., 24 hours) before sending
3. **Generate:** Create feedback request email (template + personalization)
4. **Send:** Via connected email (Gmail/SMTP)
5. **Track:** Log as Activity, store response if received

### Integration Points
- Supra parsing workflow (trigger source)
- Email sending (existing follow-up / connections)
- Templates (ShowingHQ templates module)

### Future Files
- `lib/automation/feedback-request.ts` — feedback request logic
- `app/api/v1/automation/feedback-request/route.ts` — manual trigger or cron

---

## 3. Transaction Pipeline / Document Storage

**Goal:** Future TransactionPilot or DealForge module for transaction management.

### Concepts
- **Transaction:** Tied to Property, Contacts (buyer/seller), stages (offer, inspection, closing)
- **Documents:** Contracts, addenda, disclosures — store metadata, links to cloud storage
- **Pipeline:** Stage-based workflow (e.g., Pending → Under Contract → Closing → Sold)

### Data Model (Future)
```
Transaction
  - propertyId
  - buyerContactId, sellerContactId
  - stage (enum)
  - documents[] (metadata + storage ref)
  - activities[]
```

### Storage
- Supabase Storage or S3 for document files
- Metadata in Postgres (Transaction, TransactionDocument tables)

### Future Files
- `prisma/schema.prisma` — Transaction, TransactionDocument models
- `app/(dashboard)/transactions/` — transaction list, detail
- `app/api/v1/transactions/` — CRUD, document upload

---

## 4. Supra API (If Available)

- Check Supra developer docs for official API
- May support: showing sync, feedback submission, lockbox events
- Prefer API over email parsing when available

---

## Reference

- `docs/integrations/CONNECTIONS_ARCHITECTURE.md` — auth and connectors
- `docs/PHASE_3_DEALFORGE_DESIGN.md` — existing deal/transaction design
