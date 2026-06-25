# Ajeet Alumni App — What We've Built

_Official alumni platform of the Ajeet Alumni Association (AAA), Sainik School Bijapur._
_Current release: `1.0.0-beta.4`_

A web app where Ajeets can claim or create their alumni profile, connect through a
searchable directory, and where the committee can manage members — all without
touching a database. Built with React + Supabase, hosted on Replit.

---

## For alumni (members)

| Area | What they can do |
|------|------------------|
| **Claim ID** | Existing alumni (from imported records) claim their own profile via email verification |
| **Register** | New alumni self-register through a guided wizard, with optional profile photo |
| **Sign in** | Magic link / OTP, or email + password (with show/hide password) |
| **Profile** | Edit professional info, contact, skills, LinkedIn/website; upload & crop a photo |
| **Privacy** | Choose directory visibility and control which fields others can see |
| **Directory** | Search fellow Ajeets by name, batch, year, or house (privacy-respecting) |
| **Mentorship** | Opt in as a mentor with booking links |
| **Get Involved** | Express interest in contributing to AAA initiatives |
| **Share card** | Generate a visual alumni card to post on WhatsApp / LinkedIn |

## For the committee (admins)

| Tool | What it does |
|------|--------------|
| **Review Queue** | Approve or reject pending claim/registration requests |
| **Member Support** | Look up any member to see their full onboarding picture — status, imported-vs-current data, a step-by-step timeline, email history, and quick actions (resend approval, resend password reset). Designed so support can be done **without SQL**. |
| **Get Involved** | View who has volunteered for initiatives |
| **Import** | Upload alumni CSVs with a preview/diff before committing |

## Trust & safety

- Email verification before admin review
- Privacy controls per member and per field
- Role-based access (members vs admins) enforced in the database
- Generic error messages on lookups to avoid leaking who exists

---

## How it's built (for the technical team)

- **Frontend:** React 18, TypeScript, Vite, Tailwind, React Router v7
- **Backend:** Supabase — Postgres with row-level security, Auth, Storage, Edge Functions
- **Email:** transactional emails sent from edge functions, all logged centrally for support visibility
- **Hosting:** Replit (production), source of truth on GitHub `main`

### Release workflow

1. Develop and build in **Cursor**, push to **GitHub `main`**
2. Frontend (`package.json`) and backend (`supabase/VERSION.json`) versions are kept in sync
3. **Replit** pulls `main` and redeploys
4. Database changes apply via SQL migrations / scripts in the Supabase dashboard

See [`CHANGELOG.md`](../CHANGELOG.md) for the full release history.
