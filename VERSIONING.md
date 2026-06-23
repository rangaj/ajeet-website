# Versioning

The Ajeet Alumni App uses **one release version** for both frontend and backend, aligned on every rollout.

| Artifact | Location | Example |
|----------|----------|---------|
| **App release** | Git tag `v*` | `v1.0.0-beta.1` |
| **Frontend** | `package.json` → `version` | `1.0.0-beta.1` |
| **Backend** | `supabase/VERSION.json` | `1.0.0-beta.1` |

Stakeholders can refer to a single version (e.g. **1.0.0-beta.1**). Engineering uses the git tag plus deploy targets (Replit commit, Supabase migrations/functions).

## Semantic versioning

- **MAJOR** (`2.0.0`) — breaking schema, auth, or API changes
- **MINOR** (`1.1.0`) — new features, backward-compatible
- **PATCH** (`1.0.1`) — bug fixes only
- **Pre-release** (`1.0.0-beta.2`, `1.0.0-rc.1`) — not production GA

Move to **`1.0.0`** when business email is live and Phase 1 is signed off for general alumni use.

## Release checklist (every rollout)

1. **Implement** changes on `main`
2. **Bump** `package.json` `version`
3. **Update** `supabase/VERSION.json` (version, `migrations_through`, `edge_functions` if changed)
4. **Add** entry at top of `CHANGELOG.md`
5. **Commit** on `main`, e.g. `Release v1.0.0-beta.2`
6. **Tag** `git tag -a v1.0.0-beta.2 -m "Release v1.0.0-beta.2"`
7. **Push** branch and tag: `git push origin main && git push origin v1.0.0-beta.2`
8. **Deploy**
   - Replit: pull tag/commit → Publish
   - Supabase: run new migrations (if any) → redeploy changed edge functions
9. **Verify** production URL matches tag (optional: Admin queue build marker or `/` health)

## Backend version file

`supabase/VERSION.json` records what must be deployed with that release:

```json
{
  "version": "1.0.0-beta.1",
  "migrations_from": "20250622000001",
  "migrations_through": "20250622000008",
  "edge_functions": ["start-claim", "start-registration", "..."]
}
```

When only edge functions change (no migration), bump patch/pre-release and list updated functions.

## Current release

See [CHANGELOG.md](./CHANGELOG.md) and latest git tag:

```bash
git describe --tags --abbrev=0
```

## Automation

### What runs automatically (after one-time setup)

| Trigger | Workflow | What it does |
|---------|----------|----------------|
| Every push/PR to `main` | **CI** | Build + verify `package.json` and `supabase/VERSION.json` versions match |
| Push a tag `v*` (e.g. `v1.0.0-beta.2`) | **Release** | Checks tag = version, reads `CHANGELOG.md`, creates a **GitHub Release** |
| Manual button in GitHub Actions | **Deploy Supabase** | Runs migrations + deploys all functions listed in `supabase/VERSION.json` |

### One-time setup (do once)

#### 1. GitHub Actions (already in repo)

Push `.github/workflows/` to `main`. No secrets needed for CI or Release.

Confirm: **GitHub repo → Actions** tab shows CI running on the next push.

#### 2. Replit — auto-deploy frontend on `main`

In your Repl:

1. **Deployments** → connect **GitHub** → branch `main` (or deploy only on tags if Replit supports it)
2. Enable **auto-deploy on push** (or pull on push + Publish)
3. Ensure Secrets still have `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

After this, every push to `main` rebuilds the FE. For release discipline, you can instead deploy only when you push a `v*` tag (if your Replit plan supports tag-based deploys); otherwise pull/publish after each tag.

#### 3. Supabase — optional GitHub deploy workflow

To use **Deploy Supabase** from GitHub Actions:

1. [Supabase access token](https://supabase.com/dashboard/account/tokens) → copy token
2. GitHub repo → **Settings → Secrets and variables → Actions** → add:

   | Secret | Value |
   |--------|--------|
   | `SUPABASE_ACCESS_TOKEN` | Your Supabase personal access token |
   | `SUPABASE_PROJECT_REF` | Project ref from dashboard URL (`https://supabase.com/dashboard/project/<ref>`) |

3. GitHub → **Actions → Deploy Supabase → Run workflow** → enter tag (e.g. `v1.0.0-beta.2`)

Without these secrets, deploy backend manually (SQL editor + function deploy) as today.

### Your workflow each release (≈5 minutes)

1. Bump `package.json` + `supabase/VERSION.json` (same version)
2. Add section to top of `CHANGELOG.md`
3. Commit and push `main`
4. Tag and push (this triggers GitHub Release automatically):

   ```bash
   git tag -a v1.0.0-beta.2 -m "Release v1.0.0-beta.2"
   git push origin main
   git push origin v1.0.0-beta.2
   ```

5. **Replit** — auto if configured, else Pull → Publish
6. **Supabase** — run **Deploy Supabase** workflow, or manual migrate + function deploy

Local checks before tagging:

```bash
npm run version:check
npm run build
npm run changelog:notes 1.0.0-beta.2   # preview release notes
```

### What cannot be fully automated yet

- **Supabase Auth redirect URLs** — update once when production URL changes
- **Stakeholder comms** — use the GitHub Release URL as the shareable artifact

