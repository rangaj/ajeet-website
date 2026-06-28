# AAA Membership, Fees & Payments — Plan

_Status: DECISIONS LOCKED 28 Jun 2026. **Phase A (founding/first-batch correction) built 28 Jun 2026** (v1.0.0-beta.6). **Phase B (membership core, no gateway) built 28 Jun 2026** (v1.0.0-beta.7), ships fully dark. Phases C–D awaiting build go-ahead._
_Source: MOA & Rules of the Ajeet Alumni Association v1.8 (Karnataka Societies Registration Act, 1960; legal-comments version dated 2 Nov 2023) + product discussion 28 Jun 2026._

This plan operationalizes the Association's constitution. It introduces a paid
**Ajeet Member** tier (governance + member benefits) on top of the existing free
**verified Ajeet** identity tier, builds the full membership/fees/receipts system
**gateway-agnostic and switched off**, and corrects the founding/first-batch dates
throughout the app.

> **Guiding rule:** every feature here traces to a specific MOA article. The app is
> the Association's system of record for the **Roll of Members** (Art 12, 14, 25) and
> the **electoral roll as of a record date** (Art 7(e)(ii), 20(a)(iii)).

## Locked decisions (28 Jun 2026)

| # | Decision | Outcome |
|---|----------|---------|
| 1 | Founding vs first batch: founded **1963**, first pass-out batch **1967** — factor throughout | ✅ Agreed |
| 2 | Build offline-payment-first, gateway-agnostic, settings-driven, **ships dark** until enabled | ✅ Agreed |
| 3 | Renewal cycle | ✅ **FY-aligned** (1 Apr–31 Mar), pro-rata for mid-year joiners |
| 4 | Lifetime membership option | ❌ **No for now** (would need EC/bye-law under Art 31) |
| 5 | Currency / geography to start | ✅ **India + INR only** (sidesteps FCRA initially) |
| 6 | Concession handling (Art 7(e)(ii)) | ✅ Never block the vote for <8-yr-grad or 70+; still invite payment. Revisit later |
| 7 | Gating line | ✅ Gate governance + member publications/schemes/voting; **directory stays open** |
| 8 | Receipts | ✅ Build **both** (`plain` + `80g`); super-admin chooses active mode at setup |
| 9 | Member-facing rollout | ✅ **Fully dark** (no teaser/banner) until `live` |
| 10 | Preview while hidden | ✅ Super-admins always; plus a **trusted-tester allowlist** (`membership_preview_user_ids`) |
| 11 | Go-live authority | ✅ Single super-admin operates the toggle, **but `live` requires a recorded EC resolution reference** (audited per Art 6, 7, 25) |

## Membership model (MOA-grounded)

Two distinct tiers — do **not** conflate them:

- **Verified Ajeet (free, identity):** an *Ajeet* per Art 4(d) — passed out of SSBJ after
  ≥1 academic year. This is what the directory verifies today. Gets directory, profile,
  search, mentorship, Get Involved, contact, share card. **Never paywalled.**
- **Ajeet Member (paid, rights):** a verified Ajeet, 18+ (Art 8(a)), who has paid the fees
  (Art 7(a)). Appears on the **Roll of Members**. Unlocks voting (Art 7(e)) and member
  benefits (Art 9).

Member types (Art 7):

- `ajeet` — pays fees; **votes**.
- `honorary` (Art 7(c)) — EC-granted (staff/principal etc.); **fee-exempt, non-voting**.
- `patron` (Art 7(d)) — EC-granted; serving Principal ex officio; **fee-exempt, non-voting**.

## Fees (Art 6, Art 7)

Three EC-set, config-driven components (amounts editable — the EC revises them, Art 6;
renewal reviewed every 5 yrs, Art 7(b)(ii)):

1. **Registration fee** — one-time, **non-refundable** (Art 7(a)).
2. **Initial membership fee** — first period.
3. **Renewal fee** — annual, **FY-aligned** (1 Apr–31 Mar, Art 4(v)); pro-rata for mid-year joiners.

Default currency **INR**. Income is not distributable to members (Art 5); funds go to a
scheduled-bank account in the Association's name (Art 24); every receipt is numbered (Art 21(b)).

## Voting eligibility (Art 7(e))

A member may vote when, **as of the electoral-roll record date**:

- `member_type == ajeet`, **and**
- in good standing (registration + current renewal paid, not in default), **OR**
- **voting-exempt** — within 8 years of graduation **or** 70+ (computed flag, Art 7(e)(ii)).

Honorary/Patron members never vote. Default restores voting on payment with interest
(Art 7(e)(ii)) — model an arrears/"with interest" marker; interest computation deferred.

## Gating line (Art 9 + Art 7(e))

| Area | Access |
|------|--------|
| Directory, profile, search, mentorship, Get Involved, contact, share card, policy pages | **Open** (all verified Ajeets) |
| Voting / elections / AGM participation; member-of-record announcements; newsletter & annual magazine; scheme/assistance eligibility; member-rate event pricing | **Gated** (paid Ajeet Members) |

Gating logic is inert while the module is disabled (decision #2).

---

## Founding/first-batch correction (decision #1)

Encode **founded 1963** (heritage — correct as-is) vs **first graduating batch 1967**
(the real floor for batch/age logic). Current code conflates them.

| Location | Today | Change to |
|----------|-------|-----------|
| `RegisterPage.tsx` batch (`course_end_year`) validation | floor **1963** | floor **1967** |
| `constants/directory-browse.ts` `BATCH_PRESETS` | earliest preset **"1963"** | earliest **"1967"** (or "1967–1969 founding batches") |
| `RegisterPage.tsx` join (`course_start_year`) validation | floor **1955** | floor **1963** |
| `constants/school-years.ts` `joinYearFromBatchYear` | `batch − 7` (→ 1960 for batch 1967) | **clamp result to ≥ 1963** |
| `RegisterPage.tsx` + `update_own_dob.sql` DOB floor | birth year **< 1940** | birth year **< ~1947** (1967 − 19, +slack) |
| `RegisterPage.tsx` DOB `min` attr | `1940-01-01` | `1947-01-01` |
| Migrations `search_batch_year_query.sql`, `normalize_course_start_year.sql` | review | align any embedded floors |

**Leave as-is (correct):** `HomePage.tsx` "Founded 1963 / Since 1963 / 60+ years" — founding year.

---

## Build-ready, switched-off architecture (decision #2)

Three principles so the AAA gets value immediately and the gateway is a later toggle, not a rebuild:

1. **Provider-agnostic payment layer.** One internal interface (create-order, verify,
   handle-webhook, refund) behind a `provider` setting (`none | razorpay | …`). Membership,
   roll, and receipt logic never know which gateway is behind it. Razorpay is the first adapter
   when ready.
2. **Offline/manual payment goes live first — no gateway needed.** The Treasurer (Art 15(d))
   records a cheque/UPI/bank-transfer/cash payment → system issues a numbered receipt, sets
   membership status, includes the member in the Roll. The AAA collects into its existing bank
   account (Art 24) now. Online checkout later is just **another payment source** on the same ledger.
3. **Config-driven `aaa_settings` (super-admin only), ships dark.** Until `payments_enabled`,
   the "Become a member" CTA is hidden/"coming soon", gating is inert, everything else unaffected.

### `aaa_settings` (single row)
- Entity: registered name, registration no., registered office (Vijayapura, Karnataka),
  PAN, 12A/80G numbers, financial year (default 1 Apr–31 Mar).
- Fee schedule: registration / initial / renewal amounts + currency (INR).
- `receipt_mode`: `plain | 80g`; receipt-number series.
- Gateway: `provider`, keys (in Supabase secrets, **never** in repo), `payments_enabled` flag.
- Rollout controls: `membership_module_state`, `membership_preview_user_ids`,
  `membership_ec_resolution_ref` (see below).

### Rollout state machine, preview & go-live authority (decisions #9–11)
The master control is an **in-app `aaa_settings` field a super-admin flips** — no redeploy,
no developer needed to greenlight. Member-facing state:

- **`hidden`** (default) — no member-facing surface at all (no nav item, no banner, no mention).
- **`coming_soon`** — reserved for later; not used for the initial rollout (decision #9 = fully dark).
- **`live`** — full module: offline payment recording, receipts, status, gating active.

**Preview while hidden (decision #10):** super-admins can always see and *exercise* the module
(record a test offline payment, generate a test receipt, view the draft Roll). A
`membership_preview_user_ids` allowlist additionally grants a few **trusted testers**
(e.g. Treasurer / an EC member) preview access without exposing members. This keeps the
code exercised in production, avoiding dormant-code rot.

**Go-live authority (decision #11):** a single super-admin operates the toggle, **but the
transition to `live` is blocked unless `membership_ec_resolution_ref` is filled** (resolution
no. + date / note). Reverting to `hidden` is always allowed (de-risking). Every state change
records actor + timestamp + resolution reference in `admin_audit_log` — so the greenlight is
auditable and traces to the body empowered to set fees (Art 6, 7) and to the records duty (Art 25).
Multi-party approval is deferred; the recorded resolution reference is the accountability anchor.

**Server-side enforcement (not cosmetic):** while not `live`, payment/receipt RPCs **refuse to
run** and gating checks **default to open** (never lock members out). When `live`, gating is
enforced in **RLS/RPCs**, not by hiding UI. Optional sub-toggles allow incremental enablement:
`payments_offline_enabled`, `gateway_enabled`, `gating_enforced`.

## Receipts (decision #8)
- **`plain`** — simple numbered money receipt; always valid (Art 21(b)). Default.
- **`80g`** — tax-exempt receipt; requires 12A/80G numbers in settings (+ possibly donor PAN).
- Shared numbered series tied to the financial year; super-admin selects the active mode at setup.

---

## Data model sketch (discussion level — finalize at build)

- `aaa_settings` — config above (single row).
- member `member_type` — `ajeet | honorary | patron`.
- `memberships` — `status` (`none | active | in_default | exempt`), valid period (FY-aligned),
  arrears / "with interest" marker.
- `payments` (ledger) — `source` (`offline | razorpay | …`), amount, currency, gateway refs,
  status, idempotency key, linked receipt; reconciles to FY for Treasurer/audit (Art 11(g), 25).
- `receipts` — numbered series, mode, FY, snapshot of entity details.
- Exports — **Roll of Members** (Art 12, 25) and **electoral roll as-of-date** (Art 7(e)(ii), 20(a)(iii)).

Future-proofing: tag each payment with a **fund/destination** (`central` now) so Ajeet
Alumni Chapter dues (Art 16–17, own bank accounts) drop in later without migration.

---

## Phased plan

### Phase A — Founding/first-batch correction (low effort, low risk)
Apply the §"Founding/first-batch correction" table. Independent of payments; ship anytime.

### Phase B — Membership core, no gateway (BUILT, ships fully dark — v1.0.0-beta.7)
- ✅ `aaa_settings` + super-admin setup screen (entity, fees, FY, receipt mode; gateway off). _Migrations `20250628000002-04`; `/admin/membership`._
- ✅ `member_type`, `memberships`, `membership_payments`, `membership_receipts` schema + RLS.
- ✅ **Offline payment recording** (Treasurer) → standing + numbered receipt (both plain/80G modes), idempotent.
- ✅ Membership status surfaced in profile (`MembershipStatusCard`, live-only) + Member Support console (`MemberMembershipPanel`, manager-only).
- ◻️ **Gating** helpers/flags present (`gating_enforced`, `can_manage_membership`), inert; directory stays open. A "Become a member" benefits page is not built yet (decision #9: fully dark, no teaser).
- ✅ **Roll of Members** + **electoral-roll as-of-date** export (CSV).
- ✅ Computed `voting_exempt` (8-yr-grad / 70+).
- **Rollout:** `module_state` (`hidden`/`coming_soon`/`live`) defaults to `hidden`; go-live guarded by a trigger requiring `ec_resolution_ref`; preview allowlist for trusted testers.

### Phase C — Gateway adapter (flip the switch)
- Razorpay adapter: hosted checkout, signed webhook (idempotent edge function), auto-receipt.
- Enable via `aaa_settings` (provider + keys + `payments_enabled`). Pure config; no logic rewrite.

### Phase D — Governance tooling (later)
- In-app polls / voting honoring **single transferable vote** (Art 20(b)) against the electoral roll.

---

## Out of scope / later (confirmed)
- **Lifetime membership** (decision #4) — revisit only with EC/bye-law (Art 31).
- **Foreign/NRI dues & FCRA** (decision #5) — India/INR only to start; separate compliant rail later.
- **Ajeet Alumni Chapter** dues/finances (Art 16–18) — design hooks now (fund tag), build later.
- **Interest-on-arrears** computation (Art 7(e)(ii)) — marker only for now.
- **80G donor-PAN capture** specifics — confirm with CA before enabling `80g` mode.
- **GST treatment** of membership fees — confirm with CA before go-live.

---

## Compliance flags (resolve before enabling payments)
- 12A/80G registration status (gates `80g` receipt mode).
- GST applicability on membership fees.
- Gateway onboarding needs society registration cert + PAN + bank proof in the Association's name.
- Two-signatory control on disbursements (Art 24(b)) is a banking/operations control, not app logic.

## Decisions
All open decisions are resolved — see **Locked decisions (28 Jun 2026)** at the top.

## Suggested build order (when greenlit)
1. **Phase A** — founding/first-batch correction.
2. **Phase B** — membership core with offline payments + receipts + Roll/electoral-roll export (no gateway).
3. **Phase C** — Razorpay adapter; enable via settings.
4. **Phase D** — voting/governance tooling.
