# Sign-up & Profile Improvements — Plan

_Status: DECISIONS LOCKED 26 Jun 2026. Not built yet — awaiting build go-ahead._
_Source: field feedback (26 Jun 2026) on sign-up and profile data capture._

## Locked decisions (26 Jun 2026)

| # | Decision | Outcome |
|---|----------|---------|
| 1 | Hide Course / Stream / educational_course from all UIs (keep columns) | ✅ Yes |
| 2 | Editable join year (auto-fill default) at sign-up + profile | ✅ Yes |
| 3 | Collect LinkedIn + X + Website at sign-up | ✅ Yes (all three) |
| 4 | Add X/Twitter input to profile | ✅ Yes |
| 5 | Directory-visibility consent at sign-up | ✅ Yes |
| 6 | Mentoring + Get Involved light opt-in at sign-up | ✅ Yes |
| 7 | Self-service login-email change (verified) | ✅ Yes |
| 8 | Country code + phone-format validation (E.164) | ✅ Yes |
| 9 | Work history approach | ✅ Light hint (Option A) |
| 10 | Remove unused sign-up fields (yrs exp, industries) | ❌ Keep them |
| 11 | Self-edit name/batch/house | ❌ Keep correction-only |

## Goal

Capture the right data at the right time, let members keep it current, and stop
showing fields that have no utility — while preserving legacy/imported data integrity.

## Guiding principles

- **Factual & user-controlled:** members can update their own contact details; changes that
  affect login (email) are always verified.
- **Keep sign-up light:** add only high-value fields; defer detail to post-approval profile.
- **Preserve legacy:** never drop imported columns; only change what the UI shows/asks.

---

## Current state (as built)

- **Sign-up (4 steps)** collects: name, salutation, DOB, roll, email, **batch/passing-out year**
  (join year auto-derived, 7-yr assumption), house(s), mobile, secondary email, location,
  home town, company, position, years of experience, skills, industries, **profile photo**.
- **Join year** (`course_start_year`) is auto-calculated and **not editable** anywhere.
- **Phone** is free text — no country code, no format validation.
- **No social links, no mentoring/Get-Involved** captured at sign-up.
- **Profile (after login)** edits: role, company, location, skills, **LinkedIn, Website**, mobile,
  secondary email, mentorship, Get Involved, privacy toggles.
  - **X/Twitter:** column `twitter_link` exists and is saved, but there is **no input** for it.
  - **Primary (login) email:** not self-editable — admin-only via Member Support.
  - **Name / batch / house:** not self-editable (corrections via "Report a correction").
- **Course / Stream / educational_course:** columns exist and are **shown** in Directory detail,
  Directory advanced filters + query, and Admin Review Queue.
- **Profile photo at sign-up:** already supported (uploaded on the pending page).

---

## Phased plan

### Phase 0 — Removal-only quick wins (low effort, low risk)
- **Hide Course / Stream / educational_course** from all UIs (keep columns).
  - Files: `DirectoryMemberDetail.tsx`, `DirectoryAdvancedFilters.tsx`,
    `constants/directory-browse.ts`, `DirectoryPage.tsx`, `AdminQueuePage.tsx`.
- **Add the missing X/Twitter input to the profile** (field already wired to save).
  - Files: `ProfilePage.tsx`.
- _Note: `work_experience_years` and `industries_worked_in` are **kept** (decision #10)._

### Phase 1 — Sign-up data capture (medium effort)
- **Editable join year** at sign-up (auto-fill default, user can override).
  - Files: `RegisterPage.tsx` (Step 2), `start-registration` payload.
- **Social links at sign-up:** LinkedIn, X (Twitter), Website (optional).
  - Files: `RegisterPage.tsx`, `start-registration`.
- **Directory-visibility consent at sign-up:** "Show me in the directory?" + per-field toggles.
  - Files: `RegisterPage.tsx`, `start-registration`, visibility defaults.
- **Mentoring / Get Involved interest** as light opt-in checkboxes (interest only, details later).
  - Files: `RegisterPage.tsx`, `start-registration`.

### Phase 2 — Phone with country code + format (medium effort)
- Country-code selector + per-country format validation; store E.164 (`+CC…`).
  - Likely add `libphonenumber-js`.
  - Files: new `PhoneInput` component, `RegisterPage.tsx`, `ProfilePage.tsx`.
- Editable join year + phone also editable in profile/settings.

### Phase 3 — Self-service email change with verification (medium effort, security-sensitive)
- Let members change their **login email** in profile; require verification of the new address
  before it becomes active (reuse `pending_email` state + Supabase secure email change).
- Log the change so it appears in the (now factual) Member Support timeline.
  - Files: `ProfilePage.tsx` (or Settings), Supabase Auth flow, `member_email_events` logging.

### Phase 4 — Work history (chosen: Option A, light)
- Keep single company/role; add a hint —
  _"List roles oldest → newest separated by ' | '; most recent last."_ Matches legacy display.
  - Files: `ProfilePage.tsx`, `RegisterPage.tsx` (company field hint).

---

## Out of scope / later (confirmed)
- Self-editable name/batch/house → **kept correction-only** (decision #11); stays via "Report a correction".
- Cleanup of redundant `course` vs `educational_course` columns.
- Sticky mobile save-bar for the long profile form.
- Structured work-history table (revisit later if the pipe convention proves limiting).

---

## Decisions

All open decisions are resolved — see **Locked decisions (26 Jun 2026)** at the top.

## Suggested build order (when greenlit)

1. **Phase 0** — removal-only quick wins (hide Course/Stream; add X/Twitter to profile).
2. **Phase 1** — sign-up additions (join year, social links, visibility consent, mentoring opt-in) + work-history hint.
3. **Phase 2** — phone country code + format (sign-up + profile).
4. **Phase 3** — self-service verified email change.
