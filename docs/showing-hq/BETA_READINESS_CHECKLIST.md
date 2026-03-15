# ShowingHQ Beta Readiness Checklist

Internal checklist for validating ShowingHQ before first external beta users.

---

## Pre-beta validation

- [ ] **Create open house** — Complete flow from /open-houses/new (property, dates, title)
- [ ] **Sign-in test** — Open /open-houses/sign-in, select showing, view QR + visitor form
- [ ] **Gmail connected** — Settings → Connections → Connect Gmail (or via Getting Started)
- [ ] **Calendar connected** — Settings → Connections → Connect Google Calendar
- [ ] **First visitor captured** — Submit sign-in at /oh/[slug], verify visitor appears in dashboard + /showing-hq/visitors
- [ ] **Follow-up visible** — After visitor signs in, generate follow-up from open house, verify it appears in /showing-hq/follow-ups

---

## Flow checks

1. **First visit** → Landing on ShowingHQ dashboard (not generic Home)
2. **Getting Started** → Steps link correctly, OAuth flows work for Gmail/Calendar
3. **Empty states** → Clear CTAs, no dead ends
4. **Visitor sign-in** → Public /oh/[slug] form submits, creates contact + visitor
5. **Follow-up** → Draft generation works, send button functions

---

## Known dependencies

- Clerk auth
- PostgreSQL (Supabase)
- Google OAuth (Gmail, Calendar)
- Resend (email sending)
