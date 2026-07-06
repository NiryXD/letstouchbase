# TODO — get letstouchbase fully functional

The code is complete (Phases 1–6) and the security-hardening pass is in. What's
left is **operational**: provision services, set keys, apply the DB, cut a
build, and run the Play closed test. Work top to bottom — each item is a hard
gate for the next. Full command-level detail lives in [`LAUNCH.md`](LAUNCH.md);
this is the checklist to track against.

Legend: 🔴 blocker for a working app · 🟡 needed before store submission · 🟢 polish

---

## 1. Accounts & secrets (do first)
- [ ] 🔴 Create/confirm free-tier accounts: Supabase, Clerk, RevenueCat, Expo/EAS,
      Sentry, PostHog, Cloudflare Pages. (Google Play = the only $25 spend.)
- [ ] 🔴 Put `EXPO_PUBLIC_*` keys in `apps/mobile/.env` (see `.env.example`) and,
      for builds, as EAS env vars — Supabase URL + anon key, Clerk publishable
      key at minimum to boot the app.
- [ ] 🔴 Confirm Clerk ↔ Supabase third-party auth is wired (`docs/plan/09-setup-runbook.md`).

## 2. Database
- [ ] 🔴 `supabase link --project-ref fzvsaxwmbllrbpzxmded`
- [ ] 🔴 `supabase db push --include-all` — applies the **4 pending migrations**,
      including `20260706120000_harden_update_grants.sql` (the security fix).
- [ ] 🔴 Run the LAUNCH.md §1 verify queries — tables/functions exist **and** the
      hardening checks pass (`authenticated` has no UPDATE on `profiles.boosted_until`
      / `desirability`; `matches_guard` + `messages_guard` triggers present).
- [ ] 🟢 Confirm CI is green on push — the new `db-tests` job runs the pgTAP suite
      (RLS isolation, deck ranking, hardening regressions).

## 3. Edge Functions
- [ ] 🔴 Deploy all five with `--no-verify-jwt` (each self-auths): `push-dispatch`,
      `revenuecat-webhook`, `join-waitlist`, `submit-reference`, `delete-account`.
- [ ] 🔴 Set secrets: `LTB_WEBHOOK_SECRET`, `RC_WEBHOOK_SECRET`, `CLERK_ISSUER`,
      `CLERK_SECRET_KEY` (`openssl rand -hex 32` for the webhook secrets).
- [ ] 🔴 **Redeploy `push-dispatch` after §2** — it now reads `notification_prefs`.
- [ ] 🟡 Create the 4 Database Webhooks → `push-dispatch` (messages, screens,
      matches, rejection_letters) with the `x-ltb-webhook-secret` header.
- [ ] 🟢 Smoke: hit `push-dispatch` with a wrong secret → expect `401`.

## 4. Monetization (RevenueCat)
- [ ] 🟡 Android public SDK key → `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`.
- [ ] 🟡 Entitlement `executive`; products `ltb_executive_monthly`,
      `ltb_headhunt_1/5`, `ltb_boost_1`; a `default` offering set Current.
- [ ] 🟡 Webhook → `revenuecat-webhook` with `Authorization: Bearer <RC_WEBHOOK_SECRET>`.
- [ ] 🟡 Sandbox test: buy subscription → `entitlements.is_executive` flips true,
      Inbound grid unblurs; buy a Headhunt → credit increments.

## 5. Observability
- [ ] 🟢 Sentry DSN → `EXPO_PUBLIC_SENTRY_DSN` (disabled in `__DEV__` by design).
- [ ] 🟢 PostHog key → `EXPO_PUBLIC_POSTHOG_KEY`; verify funnel events land.

## 6. Mobile build & device test
- [ ] 🔴 `eas init` (writes `projectId` — without it, push registration no-ops).
- [ ] 🔴 `eas build --profile development --platform android`; install on a real
      device (push + RevenueCat are native — Expo Go can't load them).
- [ ] 🟡 Verify the **notification pre-prompt** appears once, then the OS dialog;
      grant it → a row appears in `devices`. (New this pass — LAUNCH.md §9.)
- [ ] 🟡 Verify Inbound/Pipeline **tab badges** reflect pending applications and
      Action Required. (New this pass.)

## 7. Marketing site
- [ ] 🟡 Cloudflare Pages: set `NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL`, deploy
      `apps/web` (static export). Verify waitlist + reference forms hit the real
      functions (rows land in `waitlist` / `reference_letters`).

## 8. Seed the cold-start pool
- [ ] 🟢 `npm run seed`, then `select ltb_dev_scatter_seeds();` near a real
      located user so the deck isn't empty in testing.

## 9. Store-readiness gate (Play parity — all must pass)
- [ ] 🟡 Report + Block removes the user from deck/inbound.
- [ ] 🟡 Account deletion works in-app (You → Tender Your Resignation).
- [ ] 🟡 18+ gate enforced (UI + the `profiles_18_plus` DB constraint).
- [ ] 🟡 Privacy + Terms URLs live and linked in the Play listing.
- [ ] 🟡 No external payments anywhere near digital goods (RevenueCat/Play only).

## 10. End-to-end smoke (two accounts, one build)
- [ ] 🟡 Screen → Cover Letter → Offer Extended → push on both sides → realtime
      Alignment Call → Endorse → Terminate → Exit Interview → Formal Rejection.
- [ ] 🟡 Free account hits 8 screens/day → paywall → subscribe → unlimited + grid.

## 11. Launch
- [ ] 🟡 Start the **20-tester / 14-day closed test** the day the first preview
      build is stable (required for new personal Play accounts).
- [ ] 🟢 `eas build --profile production` → `eas submit -p android` → promote
      internal → closed → open → production.
- [ ] 🟢 iOS is a build-and-submit exercise whenever the $99/yr Apple fee is
      justified (codebase is already iOS-ready).

---

_Security posture note: the 2026-07-06 audit closed two privilege-escalation
gaps (free self-boost; match fabrication → private-résumé theft). The fix is
migration `20260706120000` and is verified by `supabase/tests/hardening.test.sql`,
now enforced in CI. Item 2 above applies it — do not skip it._
