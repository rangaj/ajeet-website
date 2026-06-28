# Changelog

All notable releases of the Ajeet Alumni App. Versions follow [Semantic Versioning](https://semver.org/).
Frontend (`package.json`) and backend (`supabase/VERSION.json`) share the same release number.

## [1.0.0-beta.6] - 2026-06-28

Founding/first-batch date correction (Phase A of the membership plan).

The school was founded in **1963**, but its **first batch passed out in 1967**
(MOA & Rules, Art 19(a)). The app previously treated 1963 as a valid batch year
and allowed pre-founding join years; this aligns all batch/join/DOB bounds with
the facts.

### Frontend
- Single source of truth for the dates in `constants/school-years.ts` (`SCHOOL_FOUNDED_YEAR` 1963, `FIRST_PASSOUT_BATCH_YEAR` 1967, `MIN_BIRTH_YEAR` 1947, `MAX_SCHOOL_YEAR`)
- **Batch (passing-out) year** floor is now **1967** (was 1963); **join year** floor is **1963** (was 1955) at sign-up and in the profile
- Join-year auto-calc is **clamped to ≥ 1963**, so founding batches no longer derive an impossible pre-founding join year (e.g. Batch 1967 no longer suggests 1960)
- **DOB** lower bound tightened to **1947** (date picker `min` + validation), consistent with a first pass-out of 1967
- Directory **batch filter**: the stray single-year "1963" preset is replaced with a **1960s (1967–1969)** founding-era bucket
- Heritage copy ("Founded 1963 / Since 1963") is unchanged — that's the founding year and is correct

### Backend (Supabase)
- Migration `20250628000001`: `update_own_dob` birth-year floor 1940 → **1947**; `update_own_join_year` floor 1955 → **1963**; one-time data fix clamping any legacy `course_start_year` below 1963 up to 1963

## [1.0.0-beta.5] - 2026-06-26

Sign-up & profile improvements (Phases 0–4).

### Frontend
- **Course/Stream hidden** from member-facing directory (advanced filters, pills, member detail) and the admin review queue diff; DB columns retained
- **Profile**: added an **X (Twitter)** field; added an editable **Join year** under a new "School years" section; added an **Account** section to change the **login email** (sends a confirmation link to the new address)
- **Phone with country code**: new `PhoneInput` (curated dial-code list, India-first) storing **E.164**, with light per-country validation — used at sign-up and in the profile
- **Sign-up additions**: editable join year, social links (LinkedIn / X / Website), **directory-visibility consent**, and light **mentoring / Get Involved** interest opt-ins; work-history hint on the Organisation field (pipe-separated, newest last)
- **Admin review queue**: a "⚠ Prior rejected attempt" flag when a roll number that was rejected before re-applies — context at a glance, no auto-blocking
- **Sign-up step order**: Identity (photo, name, salutation, roll, email) → School details (batch, join year, house, DOB) → Today → Review. DOB now sits with the batch so it's validated inline against it. Wizard also scrolls to the top of each step.
- **DOB checks (sign-up + profile)**: date picker bounded to past dates; DOB (still optional) is sanity-checked against the batch — flags entries that don't fit a student joining SSBJ around age 10–11 / passing out ~17–18. Members can now also correct their DOB in the profile (new `update_own_dob` RPC enforces the same checks server-side)

### Backend (Supabase)
- Migration `20250626000001`: `approve_registration` now maps the new sign-up payload fields (social links, directory-visibility consent, Get-Involved interest) onto the member at approval; new `update_own_join_year` RPC for self-service join-year correction

### Notes
- Login-email change uses Supabase's native verified email change (client-side); timeline logging of the change is not yet wired
- Mentoring interest at sign-up is captured in the request payload for admins (it is not auto-set as a live mentor listing, which still requires a blurb + visibility)

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
