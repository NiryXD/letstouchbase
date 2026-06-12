# 07 · Roadmap, Costs & Verification

## Phase 0 — Accounts & rails (founder homework, start NOW)

1. **Google Play Console** ($25 one-time — the only unavoidable cost). New
   personal accounts require a 20-tester/14-day closed test before production
   — start this clock immediately. **Android-first**; defer Apple's $99/yr
   until traction justifies iOS.
2. Create Supabase, Clerk, RevenueCat, Expo/EAS, Sentry, PostHog, Cloudflare
   accounts — all free tiers, $0.
3. Marketing site on free `letstouchbase.pages.dev`; buy letstouchbase.com
   later (~$10/yr, optional).
4. Privacy policy + ToS (Termly free tier); 18+ age gate is mandatory.

## Phase 1 — Foundation

Monorepo scaffold, Expo app with Clerk auth, Supabase wiring + RLS, onboarding
flow = "**Build Your Resume**": labeled photo slots with dress-code guidance
(Professional Headshot required), headline, executive summary, real career
fields, education, career history, behavioral questions, optional resume PDF
upload (with redaction warning), Open-to-Work badge, Hiring Criteria.

## Phase 2 — Discovery (Hinge-style)

One-profile-at-a-time scrollable Resume cards, tap any specific item →
Initial Screen with Cover Letter, Reject Candidate button, 8/day limit,
match → "Offer Extended" celebration, Recruiter's Pick, discovery query.

## Phase 3 — Pipeline & Chat

Matches kanban, Realtime chat (Alignment Calls), push notifications, Formal
Rejection Letters, Termination, **block/report** (store-required,
non-negotiable for approval).

## Phase 4 — The Bit

Endorsements, references (shareable external link — growth loop), Department
archetype badges, Out of Office, offer-letter share cards, Exit Interview,
illustration pass (unDraw/Open Peeps in #0A66C2), app icon/brand.

## Phase 5 — Monetization

RevenueCat products, paywall ("**Upgrade Your Seat**"), Executive Suite tier
(volume only), Headhunt/Expedited Review consumables, entitlement gating,
webhook → `entitlements`.

## Phase 6 — Hardening & store prep

Sentry, moderation queue (manual review at launch, $0; paid NSFW API only at
volume), account deletion (store-required), EAS builds, Play listing, closed
test.

## Phase 7 — Launch

Seeded friend cohort beta → fix → submit → waitlist invite waves. iOS becomes
a build-and-submit mini-phase whenever the $99 Apple fee is justified.

## Cold-start strategy (dating apps die from empty rooms)

- Launch **niche-first**: tech/office workers in one metro — the audience that
  gets the joke IS the audience with density.
- Waitlist with **Employee Referral Bonus** mechanics (refer to move up).
- References are the pre-launch hook: write/receive via web link before the
  app is even installed.
- The humor is inherently screenshot-able — rejection letters and
  offer-extended cards should be beautiful enough to post. That's the
  marketing budget.

## Costs to launch

**$25 total** (Google Play, one-time). All services on free tiers.
Deferred-until-justified: Apple Developer $99/yr, custom domain ~$10/yr,
Supabase Pro $25/mo. Note: Supabase free-tier projects pause after a week of
inactivity — a non-issue once live, worth knowing during dev lulls.

## Verification checklist

- Each phase ends runnable on a real phone (Expo Go / dev-client).
- Two test accounts end-to-end: screen → cover letter → offer extended → push
  received → realtime chat → rejection letter → termination.
- RevenueCat sandbox purchases on the Play internal testing track.
- RLS audit: user A can never read user B's screens/messages via the anon
  key; resume PDFs only downloadable by matched users.
- Store-readiness: report/block works, account deletion works, 18+ gate,
  privacy/ToS URLs live, no Stripe anywhere near digital goods.
