# Changelog

All notable releases of the Ajeet Alumni App. Versions follow [Semantic Versioning](https://semver.org/).
Frontend (`package.json`) and backend (`supabase/VERSION.json`) share the same release number.

## [1.0.0-beta.4] - 2026-06-25

Admin Member Support console plus onboarding-feedback UX fixes.

### Frontend
- **Admin → Member Support**: person-centric lookup to diagnose onboarding without SQL — member search, summary, imported-vs-current diff, lifecycle timeline, email activity, diagnostics, quick actions (resend approval, resend password reset), and support notes history
- Password fields show a **show/hide eye toggle** on login and reset/set-password
- Smoother **mobile profile editing** — keyboard-aware focus scroll, `interactive-widget` viewport handling, and scroll padding so fields stay visible while typing

### Backend (Supabase)
- Migrations `000028`–`000033`: Member Support tables/RPCs, centralized `log_member_email_event` RPC, snapshot auth fix, corrected "recently approved" and "incomplete registrations" metrics, hardened RPCs with clearer errors
- Edge functions log email events via the `log_member_email_event` RPC; added `admin-update-member-email` and `admin-resend-password-reset`

### Fixes
- Login magic link no longer creates empty "shell" accounts for non-members (`shouldCreateUser: false`); unknown emails are guided to Claim/Register instead
- Import comparison now reads the nested `raw_payload` shape ({ raw, mapped })
- Build fixes: export `formatSupportError`, import `allowAdminDirectoryView`

## [1.0.0-beta.3] - 2026-06-23

Email verification gate and approval auto-linking.

### Frontend
- Admin tab **Awaiting email link** (7-day expiry, resend link, expired state)
- Claim/register messaging: must click email link before admin review
- Pending page promotes verified requests and notifies admin

### Backend (Supabase)
- Migrations `000010`–`000012`: auto-link approve by email, email verification statuses, promote on magic-link
- Edge functions: `start-claim`, `start-registration`, `notify-admin-pending`, `resend-approval-link`

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

[1.0.0-beta.4]: https://github.com/rangaj/ajeet-website/releases/tag/v1.0.0-beta.4
[1.0.0-beta.3]: https://github.com/rangaj/ajeet-website/releases/tag/v1.0.0-beta.3
[1.0.0-beta.2]: https://github.com/rangaj/ajeet-website/releases/tag/v1.0.0-beta.2
[1.0.0-beta.1]: https://github.com/rangaj/ajeet-website/releases/tag/v1.0.0-beta.1
