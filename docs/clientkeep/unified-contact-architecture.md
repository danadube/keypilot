# ClientKeep: Unified contact architecture

**Status:** Architecture / product spec — not an implementation or migration guide.  
**Owner:** ClientKeep (canonical CRM for person records in KeyPilot).

---

## System of record

- **ClientKeep is the system of record** for CRM **person** records: identity fields visible in the Contacts workspace, lifecycle stage, tags, communications history, follow-ups, and internal notes are owned by the KeyPilot **Contact** model.
- **External systems** (Google Contacts, Outlook, Mojo, CSV imports, farm/list providers) are **sources**. They contribute data and provenance; they do **not** define parallel “CRM contacts” in the product that compete with ClientKeep.
- **Operational truth** for “who is this person in KeyPilot?” is always the canonical **Contact** row and its relationships (source links, list memberships, activities). Sync state and raw provider payloads are **subordinate** to that record.

---

## Principles

1. **One person → one Contact** in the CRM (subject to explicit merge; no implied duplicate silos per integration).
2. **Provenance via links**, not duplicate master records: each integration attaches to the canonical Contact through a **source link** (provider + external identifier + account scope).
3. **Farm and mailing lists** express **membership** (Contact ↔ list/farm), not a second Contact for the same human.
4. **Dedupe and merge** are a **first-class, visible workflow** — suggestions, review, merge or dismiss, with audit history. Silent bulk auto-merge is out of scope until narrowly defined and approved.
5. **Incremental delivery**: start with a clear conceptual model and minimal storage; add tables and sync complexity only as integrations ship.
6. **Manual edits are first-class**: users can override fields; sync policies must respect overrides unless explicitly configured otherwise.

---

## Entities and relationships (conceptual)

| Concept | Role |
|--------|------|
| **Contact** | Canonical person in ClientKeep — the row users treat as “the contact.” |
| **ContactSourceLink** | Associates a Contact with an external/source record (provider, external id, connection/account scope, sync metadata). |
| **Contact identity data** | Normalized emails, phones, and related facets used for search and matching — may live on Contact + auxiliary structures as implementation matures. |
| **DedupeCandidate** | Suggested duplicate group or pair, with status (open, dismissed, merged) and confidence/signal metadata. |
| **MergeAudit** | Record of a merge: surviving Contact, merged-from contacts, actor, timestamp. |
| **Farm / list** | Named list, geography, or program (aligned with FarmTrackr or a minimal “list” concept). |
| **FarmMembership** (or **ListMembership**) | **Contact ↔ Farm/list** with enrollment status, dates, and optional source-of-enrollment. |

**Relationship summary (conceptual)**

```text
Contact 1──* ContactSourceLink     (many sources per person)
Contact 1──* FarmMembership       *──1 Farm/list
DedupeCandidate connects Contact groups → resolves via MergeAudit → single surviving Contact
```

Implementation may collapse or split physical tables later; the **relationships above are normative** for product behavior.

---

## Source model

### Contact (canonical)

Holds **CRM-visible** fields, for example:

- Identity: display name, first/last name, optional company
- Primary channels: primary email, primary phone (and eventually structured address if product standardizes it)
- CRM: stage (e.g. lead / nurture / client / past), owner, tags (many-to-many if not embedded)
- System: lifecycle timestamps, soft delete, optional `mergedInto` reference to surviving Contact after merge

Exact column lists are **implementation details**; this doc defines **ownership** and **behavior**.

### ContactSourceLink

Represents **this Contact is tied to that external record** for a given integration account.

- Provider type (Google, Outlook, Mojo, `csv_import`, `farm_import`, etc.)
- Scoped account or connection identifier (which mailbox or Mojo tenant)
- External record id and optional revision/sync cursor
- Link status: active, revoked, broken / needs attention
- Timestamps for last successful sync
- Optional reference to stored raw payload for support/debug (product decision; can be deferred)

**Rule:** The product UI must not present source links as separate “contact silos” with independent CRM lifecycles — they are **attachments** to the canonical Contact.

---

## Product rules

### Canonical vs source fields

- **Canonical fields** live on **Contact** and drive search, reporting, outbound comms, and permissions.
- **Source-contributed** values appear in UI with provenance (“from Google”, “from import”) until **promoted** to canonical or **accepted** via sync policy.
- **Promotion:** user action, or **explicit** automated rule (e.g. fill blank canonical only). Default stance: **do not overwrite** user-edited canonical fields without policy or confirmation.

### Primary email, phone, address

- **Primary** email/phone on Contact are the defaults for send, display, and dedupe presentation.
- **All known** emails/phones (from sources and history) feed **matching** and **suggestions**; implementation may use JSON, child rows, or a dedicated identity structure over time.

### Manual overrides

- Manual edits update canonical fields and should be distinguishable in policy from synced values (implementation: per-field provenance flags or override map).
- Sync jobs **must** respect “manual wins unless configured otherwise” to avoid surprising data loss.

### Dedupe candidates

- Generated from signals: normalized email match, E.164 phone, strong name + geo, same external id for same provider scope, future household/address graph.
- States: suggested → user review → **merge** or **dismiss**; optional narrow auto-merge only after explicit product approval.

---

## Dedupe and merge workflow (product)

1. **Detection** produces **DedupeCandidate** groups (or pairs) with reasons and confidence.
2. **Review UI** lets users compare side-by-side fields and source links.
3. **Merge** selects a **surviving** Contact; all dependent relationships (tags, activities, communications, memberships, source links) **repoint** to the survivor. Non-survivors are marked merged-out with pointer to survivor.
4. **MergeAudit** records the action for compliance and support.
5. **Dismiss** clears the candidate without merging; optional “never suggest this pair again” is a product option.

**No silent enterprise-wide auto-merge** in early phases.

---

## Farm / list membership

- A person in multiple farms or lists → **one Contact**, multiple **membership** rows.
- Membership carries: list/farm id, status (active, suppressed, removed), enrollment date, optional segment-within-list metadata **without** creating a second Contact.
- **Edge case (unresolved):** purely property-level mailings with no person — product may use PropertyVault or a lightweight **MailingRecord** that is **not** a Contact; avoid creating junk Contact rows until rules are defined (see Unresolved decisions).

---

## UI implications (Contacts tab and related)

**Near-term (conceptual)**

- Filters and saved views should eventually support: **stage**, **tags**, **source presence** (“has Google”, “manual only”), **membership** (“in farm X”), **dedupe queue**, **sync issues**.
- Contact **detail** should surface: **Sources** (linked accounts, last sync), **Memberships**, and **merge history** when applicable.
- **Segments** tab remains the home for saved filter definitions that serialize to URLs/query params consistent with Contacts.

Exact filter rollout order is phased (see below).

---

## Phased implementation order

| Phase | Focus |
|-------|--------|
| **A — Foundation** | Treat existing Contact as canonical; document rules; Contacts workspace UX without new storage if possible. |
| **B — Source links** | Introduce link model + first integration (e.g. Google or CSV) with explicit **match or create** before broad auto-linking. |
| **C — Identity & dedupe** | Normalized matching, DedupeCandidate queue, merge wizard, MergeAudit. |
| **D — Farm / list membership** | Farm or list entity + membership; filters on Contacts and segments. |
| **E — Sync policies** | Field-level direction, conflict resolution UI, bulk repair tools. |

---

## What to build now vs later

| Build now | Defer |
|-----------|--------|
| Product copy and IA consistent with “one canonical Contact” | Full multi-provider sync engine |
| Stage + tag filters (existing) | Source and membership filters until Phase B/D |
| Clear ownership in docs and PM specs | Auto-merge at scale |
| | Household graph / multi-person households |
| | Property-only records vs Contact (see below) |

---

## Unresolved decisions (explicit)

1. **Households:** Whether one Contact = one person always, or a future **Household** entity groups multiple Contacts — affects dedupe and mail-merge.
2. **Property-only farm rows:** Whether to create Contacts without a person signal, use PropertyVault-only records, or a separate non-CRM **MailingRecord** type.
3. **Consent and compliance:** Where opt-out / consent flags live for multi-source data (canonical vs per-link) — legal review may constrain sync overwrite rules.
4. **Auto-merge thresholds:** Any automated merge requires written policy (signals + safeguards); none assumed in early phases.
5. **ExternalRecord as first-class table:** Whether link metadata alone suffices v1 or a separate store for raw blobs — cost/ops tradeoff.

---

## Document control

- **Created for:** KeyPilot ClientKeep roadmap.  
- **Changes:** Update this doc when integration scope or compliance rules change; reference PRD/ADR links here when added.
