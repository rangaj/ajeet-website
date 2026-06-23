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
