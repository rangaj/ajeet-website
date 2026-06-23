# Changelog

All notable releases of the Ajeet Alumni App. Versions follow [Semantic Versioning](https://semver.org/).
Frontend (`package.json`) and backend (`supabase/VERSION.json`) share the same release number.

## [1.0.0-beta.2] - 2026-06-22

Post-approval password setup and recovery flow.

### Frontend
- `/reset-password` page for first-time setup and forgot-password recovery
- Recovery links route correctly (no longer sent to `/pending`)
- Forgot-password emails redirect to `/reset-password`
- Banner prompts approved users without a password to set one

### Backend (Supabase)
- Migration `20250622000009` — `profiles.password_set_at`
- `notify-registrant` approval email includes password setup link via `generateLink`
- `APP_SITE_URL` edge secret for correct redirect URLs in approval emails

## [1.0.0-beta.1] - 2026-06-22

Phase 1 beta — claim, register, admin approval, and cleaned import data.

### Frontend
- Registration wizard (4 steps, multi-house selection, optional avatar crop)
- Claim flow with email verification redirect to `/pending`
- Pending page shows request status (not conflated with admin account status)
- Admin review queue with simplified cards and bulk actions
- Register page blocks duplicate rolls with sign-in / claim guidance
- Admin import UI

### Backend (Supabase)
- Schema migrations `20250622000001`–`20250622000008`
- Edge functions: `start-claim`, `start-registration`, `attach-registration-photo`, import pipeline
- One pending approval per roll (dedupe index)
- Claim verification returns generic errors (no field leakage)
- Registration rejects existing / pending rolls (no conflict queue)
- Claim pending link by email (migration `000008`)

### Data
- Import de-duplicated; non-numeric test rolls removed; missing data cleaned

### Known limitations
- Transactional email depends on placeholder sender until business domain is configured

[1.0.0-beta.2]: https://github.com/rangaj/ajeet-website/releases/tag/v1.0.0-beta.2
[1.0.0-beta.1]: https://github.com/rangaj/ajeet-website/releases/tag/v1.0.0-beta.1
