# LAUNCH.md — letstouchbase go-live runbook

The building is done. Phases 1–6 are code-complete and the CI pipeline
(typecheck shared/mobile/web + web static build) is green. **What remains is not
code — it's operational:** apply migrations, set API keys, wire webhooks, cut an
EAS build, and run the Google Play closed test.

Do the sections in order. Each ends with a **Verify** step — don't move on until
it passes. Everything here runs on free tiers; the only unavoidable cost is the
$25 Google Play registration.

- Supabase project ref: `fzvsaxwmbllrbpzxmded`
- GitHub: `NiryXD/letstouchbase` (private)
- Prereqs: `supabase` CLI logged in (`SUPABASE_ACCESS_TOKEN` in root `.env`),
  `eas-cli` installed (`npm i -g eas-cli`), `gh` authenticated.

> This runbook supplements `docs/plan/09-setup-runbook.md` (Supabase project +
> Clerk third-party auth, assumed already done). It covers everything Phases
> 4–6 added plus the Phase 7 launch.

---

## 0. Environment variable reference (the single source of truth)

**Mobile** — `EXPO_PUBLIC_*` vars are inlined at build time. Put them in
`apps/mobile/.env` for local dev and as **EAS environment variables** (or
`eas.json` `env`) for builds. Every integration **no-ops gracefully** if its key
is absent, so you can ship incrementally.

| Variable | Used by | Required for |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | `lib/supabase.ts` | everything |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `lib/supabase.ts` | everything |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | ClerkProvider | auth |
| `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` | `lib/purchases.ts` | paywall / consumables |
| `EXPO_PUBLIC_REVENUECAT_IOS_KEY` | `lib/purchases.ts` | iOS only (defer) |
| `EXPO_PUBLIC_SENTRY_DSN` | `lib/observability.ts` | crash reporting |
| `EXPO_PUBLIC_POSTHOG_KEY` | `lib/observability.ts` | product analytics |
| `EXPO_PUBLIC_POSTHOG_HOST` | `lib/observability.ts` | optional (default `https://us.i.posthog.com`) |

**Edge Function secrets** — `supabase secrets set KEY=value`:

| Secret | Used by | Notes |
|---|---|---|
| `RC_WEBHOOK_SECRET` | `revenuecat-webhook` | matches the Authorization header set in RevenueCat |
| `LTB_WEBHOOK_SECRET` | `push-dispatch` | matches the `x-ltb-webhook-secret` header on the DB webhooks |
| `CLERK_ISSUER`, `CLERK_SECRET_KEY` | `delete-account` | already in `supabase/.env.functions` |

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected into functions by the
platform — no need to set them.

**Marketing site (Cloudflare Pages)** — build-time env var:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL` | `https://fzvsaxwmbllrbpzxmded.supabase.co/functions/v1` |

---

## 1. Database — apply the pending migrations

Four migrations are written but **not yet applied** (Phases 4–6 + the security
hardening pass). They are timestamp-named so they sort *after* the
already-applied `20260612*` ones:

- `20260614120000_phase4_the_bit.sql` — exit_interviews, endorsements insert
  policy, endorsement tallies in `ltb_profile_card`, `ltb_performance_review()`
- `20260614130000_phase5_boost.sql` — `boosted_until` column,
  `ltb_activate_boost()`, boost term in `ltb_deck_candidates`
- `20260615120000_phase6_notifications.sql` — `notification_prefs` table
- `20260706120000_harden_update_grants.sql` — **security-critical.** Column-level
  write grants + integrity triggers on `profiles`, `matches`, `messages`,
  `reference_letters`. Closes two privilege-escalation gaps found in the
  2026-07-06 audit (free self-boost; match fabrication → private-résumé theft).
  Verified by `supabase/tests/hardening.test.sql`, now run in CI.

```bash
supabase link --project-ref fzvsaxwmbllrbpzxmded   # if not already linked
supabase db push --include-all
```

`--include-all` is **required**: local low-numbered migrations (`0000…`) sort
before the applied remote `20260612*` set, and plain `db push` refuses that gap.
(See `supabase-gotchas` — this is expected, not an error.)

**Verify** (SQL editor):
```sql
select to_regclass('public.exit_interviews'),
       to_regclass('public.notification_prefs');                 -- both non-null
select proname from pg_proc
  where proname in ('ltb_performance_review','ltb_activate_boost'); -- both rows
select column_name from information_schema.columns
  where table_name='profiles' and column_name='boosted_until';   -- one row
-- hardening applied: authenticated must NOT hold UPDATE on server-owned columns
select 1 from information_schema.column_privileges
  where grantee='authenticated' and table_name='profiles'
    and column_name in ('boosted_until','desirability');         -- zero rows
select tgname from pg_trigger where tgname in ('matches_guard','messages_guard'); -- two rows
```

---

## 2. Edge Functions — deploy / redeploy

**All five deploy `--no-verify-jwt`** — each does its own auth: the webhook/form
functions check a shared-secret header, and `delete-account` verifies the user's
**Clerk** JWT against Clerk's JWKS itself (the platform verifier only knows
Supabase-signed JWTs, so it must be bypassed).

```bash
# webhook/secret-guarded
supabase functions deploy push-dispatch      --no-verify-jwt   # CHANGED in Phase 6
supabase functions deploy revenuecat-webhook --no-verify-jwt
supabase functions deploy join-waitlist      --no-verify-jwt
supabase functions deploy submit-reference   --no-verify-jwt
# self-verifies the Clerk JWT — also --no-verify-jwt
supabase functions deploy delete-account     --no-verify-jwt

# secrets
supabase secrets set LTB_WEBHOOK_SECRET="$(openssl rand -hex 32)"
supabase secrets set RC_WEBHOOK_SECRET="$(openssl rand -hex 32)"
supabase secrets set CLERK_ISSUER="https://<your-slug>.clerk.accounts.dev"
supabase secrets set CLERK_SECRET_KEY="sk_..."   # for the Clerk user delete
```

> **Phase 6 note:** `push-dispatch` now reads `notification_prefs` to honor
> per-category opt-outs + quiet hours. You **must** redeploy it after §1, or it
> will query a table that didn't exist at its last deploy.

**Verify:** `supabase functions list` shows all five `ACTIVE`. Hit
`push-dispatch` with a wrong secret → expect `401`.

---

## 3. Database Webhooks → push-dispatch

Dashboard → Database → Webhooks. Create one webhook per table below, all **POST**
to `https://fzvsaxwmbllrbpzxmded.supabase.co/functions/v1/push-dispatch` with
header `x-ltb-webhook-secret: <LTB_WEBHOOK_SECRET>`:

| Table | Events |
|---|---|
| `messages` | Insert |
| `screens` | Insert, Update |
| `matches` | Insert |
| `rejection_letters` | Insert |

**Verify:** with a test device registered (§6), send a message between two test
accounts → the recipient gets a push. Set quiet hours covering "now" in the
recipient's Notification Settings → the next push is suppressed.

---

## 4. RevenueCat (subscriptions + consumables)

App user ID **must** be the Clerk user id — already wired (`configurePurchases`
in `_layout.tsx`). The webhook decodes product ids by convention, so name them
exactly.

1. **Project → API keys:** copy the **Android public SDK key** →
   `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`.
2. **Entitlement:** create one with identifier **`executive`** (the webhook and
   `ltb_apply_executive` both key off this).
3. **Products** (create in Play Console first, then import):
   - Subscription: `ltb_executive_monthly` (~$14.99), optionally
     `ltb_executive_3mo`, `ltb_executive_6mo` — all attached to the `executive`
     entitlement.
   - Consumables: `ltb_headhunt_1`, `ltb_headhunt_5`, `ltb_boost_1`
     (the `_<n>` suffix is the quantity; "headhunt"/"boost" select the credit
     type — see `revenuecat-webhook/index.ts` `creditsFor`).
4. **Offering:** make a `default` offering **Current**, with the subscription
   package(s) and the consumable packages as available packages. The paywall
   reads `offerings.current`; the Discretionary Budget screen scans all
   offerings for products containing `headhunt`/`boost`.
5. **Webhook:** Integrations → Webhooks → URL
   `https://fzvsaxwmbllrbpzxmded.supabase.co/functions/v1/revenuecat-webhook`,
   Authorization header `Bearer <RC_WEBHOOK_SECRET>`.

**Verify (sandbox, on a dev build):** buy the subscription → within seconds
`select is_executive from entitlements where user_id='<clerk id>'` is `true`,
the paywall shows "Active", and Inbound unblurs to the grid. Buy `ltb_headhunt_1`
→ `headhunt_credits` increments; the Cover Letter composer shows the Headhunt
option.

---

## 5. Observability keys

- **Sentry:** create a React Native project → copy the DSN →
  `EXPO_PUBLIC_SENTRY_DSN`. (Sentry is disabled in `__DEV__` by design; test in
  a preview/production build.)
- **PostHog:** create a project → copy the Project API key →
  `EXPO_PUBLIC_POSTHOG_KEY`. US cloud is the default host.

**Verify:** on a preview build, force a test error → it appears in Sentry. Send a
screen/reject/match/message → `screen_requested` / `candidate_rejected` /
`screen_decided` / `message_sent` events land in PostHog Live Events.

---

## 6. EAS build + device testing

Expo Go can't load the native modules (push, RevenueCat, Sentry), so all real
testing happens in a dev/preview build. `eas.json` is committed (Android-first).

```bash
cd apps/mobile
eas init                       # links the project; writes projectId into app.json extra.eas
eas env:create --name EXPO_PUBLIC_SUPABASE_URL --value "…" --environment production preview development
#   …repeat for every EXPO_PUBLIC_* var in §0 (or paste into apps/mobile/.env for local)
eas build --profile development --platform android   # APK for daily dev
eas build --profile preview     --platform android   # shareable internal APK
```

**Verify:** install the dev build on a real Android device; sign in, finish
onboarding, grant notification permission → `select * from devices where
user_id='<clerk id>'` shows your Expo push token.

> The `projectId` is what lets `lib/notifications.ts` mint a push token — without
> `eas init`, push registration no-ops (by design).

---

## 7. Marketing site (Cloudflare Pages)

Already deployable as a static export. In the Pages project settings add the
build-time env var from §0 (`NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL`) so the waitlist
and reference forms hit the real Edge Functions instead of their graceful-failure
stubs.

```bash
npm run build --workspace web   # outputs apps/web/out for Pages
```

**Verify:** submit the waitlist form on the live `*.pages.dev` site → a row lands
in the `waitlist` table. Submit a reference via `/reference?token=…` → a row in
`reference_letters`.

---

## 8. Seed the cold-start pool

Dating apps die from empty rooms. After the first real onboarding **with location
granted**, scatter the seed cohort nearby:

```bash
npm run seed                                  # 12 seed_% profiles (root .env service key)
# then, in SQL editor, anchor them near a real user with a location:
select ltb_dev_scatter_seeds();
```

**Verify:** the Candidates deck renders cards for a freshly onboarded test user.
(Re-run `ltb_dev_scatter_seeds()` whenever the deck looks empty in dev.)

---

## 9. Store-readiness checklist (Play, Guideline parity)

Block submission until every box is checked — these are the dating-app
non-negotiables:

- [ ] **Report + Block** works (Alignment Call → Report & Block) and removes the
      user from your deck/inbound.
- [ ] **Account deletion** works in-app (You → Tender Your Resignation →
      `delete-account` function) — store-required.
- [ ] **18+ age gate** enforced in onboarding (UI) with the DB `birthdate` check
      as backstop.
- [ ] **Privacy Policy + Terms** URLs live (`/privacy`, `/terms` on the Pages
      site) and linked in the Play listing.
- [ ] **No Stripe / external payment** anywhere near digital goods — purchases go
      through RevenueCat → Play Billing only.
- [ ] Notification permission has a clear pre-prompt rationale; quiet hours +
      per-category opt-outs reachable from You → Notification Settings.

---

## 10. End-to-end smoke test (two accounts, one device build)

The full funnel, the way a reviewer will exercise it:

1. Account A requests an Initial Screen on B with a Cover Letter (and, with a
   credit, as a Headhunt).
2. B sees the inbound application → Extend Offer → **Offer Extended** celebration
   on both sides; A and B each get a push.
3. Realtime Alignment Call: messages appear live; Retract Statement works.
4. Endorse a competency; it shows on the resume with a tally.
5. Terminate → the **Exit Interview** modal records the outcome.
6. Free account hits 8 screens/day → the **paywall** appears; subscribe in
   sandbox → unlimited screens + unblurred Inbound grid.
7. A sends a Formal Rejection Letter from the inbound queue → B receives the
   "correspondence" push (unless muted/quiet hours).
8. Check Quarterly Performance Review reflects the impressions/screens/offers.

---

## 11. Phase 7 — closed test → production

- New personal Play accounts require a **20-tester / 14-day closed test** before
  production. Start this clock the day your first preview build is stable.
- `eas build --profile production --platform android` → `eas submit -p android`
  (uploads to the **internal** track per `eas.json`; promote to closed → open →
  production in Play Console).
- iOS is a build-and-submit exercise whenever the $99/yr Apple fee is justified —
  the codebase is already iOS-ready (set `EXPO_PUBLIC_REVENUECAT_IOS_KEY`, add
  the iOS RevenueCat key, build `--platform ios`).

---

_Generated by Claude Opus 4.8 alongside the Phase 4–6 build. Pending items mirror
the `ltb-phase4-5-status` project memory; update both if scope changes._
