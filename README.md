# Sainik School Bijapur — Ajeet Network

Phase 1 alumni directory: React frontend + Supabase backend.

## Where to develop

| Environment | Role |
|-------------|------|
| **Cursor** (local) | Edit code, fix bugs, run `npm run build` |
| **GitHub** (`main`) | Source of truth; CI must pass before Replit pulls |
| **Replit** | **Hosting only** — Pull → Run → Deploy |
| **Supabase Dashboard** | Database, Auth, Edge Functions, Storage |

**Do not develop in Replit.** See [REPLIT_SETUP.txt](./REPLIT_SETUP.txt) and [replit.md](./replit.md).

## Local setup

```bash
cp .env.example .env   # add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

## Release to Replit

```bash
# In Cursor, after changes:
npm run build
git add -A && git commit -m "your message" && git push origin main
```

```bash
# In Replit only:
git pull origin main   # Git pane → Pull
# Then Run (preview) or Deployments → Redeploy (production)
```

## Docs

- [REPLIT_SETUP.txt](./REPLIT_SETUP.txt) — Secrets, Auth URLs, hosting-only workflow
- [replit.md](./replit.md) — Instructions for Replit Agent (hosting-only guardrails)
- [SETUP.txt](./SETUP.txt) — Original Lovable/Supabase setup notes
