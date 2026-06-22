# Replit — HOSTING ONLY (read before any Agent use)

This Repl is a **deployment mirror** of the Sainik School Bijapur Ajeet Network frontend.
It is **not** a development environment.

## Hard rules for Replit Agent and humans

1. **Do NOT edit application source code** (`src/`, `supabase/`, `index.html`, config files).
2. **Do NOT fix build errors in Replit.** Report the error; fixes happen in Cursor → GitHub.
3. **Do NOT commit or push from Replit.** GitHub `main` is the only source of truth.
4. **Do NOT redesign UI, add features, or change Supabase integration** in this Repl.
5. **Do NOT use** `REPLIT_UI_PROMPT.txt` or `LOVABLE_PROMPT.txt` to rebuild the app here.

## Allowed actions in Replit

- `git pull origin main` (Git pane → Pull)
- **Run** / **Deploy** (uses `.replit` commands)
- Manage **Secrets**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` only
- View logs and webview for smoke testing

## If the user asks you to fix something

Reply: *"This project is hosting-only. Pull latest from GitHub after the fix is pushed from Cursor."*
Do not modify files unless the user explicitly overrides this policy for a one-off emergency.

## Architecture (context only — do not change)

- React + Vite + Tailwind frontend
- Supabase backend (Auth, Postgres, Edge Functions) — already deployed separately
- Develop in Cursor; CI runs `npm run build` on GitHub Actions before Replit pulls

## Sync workflow

```
Cursor (edit + build) → git push origin main → GitHub Actions CI → Replit Pull → Run/Deploy
```
