# Next phase prompt

**Quick prompt:** Type **`next`** in Cursor to auto-advance to the next logical step.

Use this after the scaffold + Prisma schema are in place.

---

## Phase A complete – next options

### Option 1: Generate API + UI (if starting fresh)

```
Now generate the API routes for the Open House MVP and the frontend UI for the open house workflow.
```

### Option 2: Prisma schema only (if schema missing)

```
Now generate the database schema using Prisma based on the project documents.
```

### Option 3: Current state – what’s next

This repo has:

- Prisma schema
- API routes
- Frontend UI (properties, open houses, visitors, follow-ups, report, public sign-in)
- Clerk auth, Supabase, Vercel deployment

Possible next steps:

1. ~~**PDF export**~~ ✅ Done – Download PDF button on seller report page
2. ~~**Email integration**~~ ✅ Done – Send button on follow-ups (Resend)
3. ~~**Testing**~~ ✅ Done – Jest + 18 tests (slugify, visitor, property validations)
4. ~~**Refinements**~~ ✅ Done – LoadingSpinner, PageLoading, ErrorMessage with retry

---

Paste the relevant prompt into Cursor to continue.
