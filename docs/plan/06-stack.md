# 06 · Platform, Stack & Data Model

## Platform decision: the Hinge model

**Native mobile app (Android first, iOS-ready) built with Expo/React Native.
The website is marketing only** (landing, waitlist, privacy/ToS — which the
stores require anyway).

Why not a wrapped web app: swipe-feel lives on 60fps gestures, retention lives
on push notifications, and Apple scrutinizes dating apps (Guideline 4.3) — a
webview wrapper is the highest-rejection-risk path. Expo gives one TypeScript
codebase → both store binaries; **EAS Build** compiles iOS in the cloud (no
Mac needed on Windows), **EAS Submit** uploads to stores, **EAS Update**
pushes JS fixes over-the-air without re-review.

## Stack

| Layer | Choice | Notes |
|---|---|---|
| Mobile app | Expo (latest SDK) + Expo Router + TypeScript | Single codebase, file-based routing |
| Styling | NativeWind 4 (Tailwind for RN) | Tailwind muscle memory |
| Gestures/animation | react-native-reanimated + gesture-handler | Card transitions, like-animations, offer-letter celebration |
| State | Zustand (client) + TanStack Query v5 (server) | No fetching in useEffect |
| Validation | Zod v4 | Shared schemas in `packages/shared` |
| Auth | Clerk (`@clerk/clerk-expo`) | Integrates with Supabase RLS via third-party auth |
| Backend | **Supabase** (managed) | Postgres + RLS, Realtime (chat), Storage (photos/PDFs), Edge Functions (Deno/TS) |
| Subscriptions | **RevenueCat** (not Stripe) | Stores REQUIRE IAP for dating premium; RevenueCat wraps StoreKit + Play Billing + webhooks |
| Push | expo-notifications + Expo Push Service | The retention engine |
| Observability | Sentry + PostHog | Crash + product analytics, free tiers |
| Marketing site | Next.js on **Cloudflare Pages** | Free tier allows commercial use (Vercel's doesn't). Free `*.pages.dev` subdomain until a custom domain is justified |

**Where the "servers" are:** Supabase hosts database/realtime/storage/
functions, Cloudflare Pages hosts the site, RevenueCat hosts billing infra,
Expo hosts push + OTA updates. Zero machines to administer; every service on
its free tier at launch scale.

## Monorepo layout

```
letstouchbase/
├── apps/mobile        # Expo app (the product)
├── apps/web           # Next.js marketing site
├── packages/shared    # Zod schemas, types, the Corporate Jargon glossary
└── supabase/          # migrations, edge functions, seed data
```

## Data model (Supabase Postgres, RLS on everything)

- `profiles` — user, headline, executive_summary, current_title, employer,
  industry, open_to_work_status, location (PostGIS point), resume_pdf_path
- `education` — school, degree_level, field, class_year (max 2)
- `experience` — title, company, industry, years, one_liner (max 3)
- `preferences` — all standard + corporate vectors, per-vector
  is_dealbreaker flag
- `behavioral_answers` · `photos` (Storage refs, ordered, slot_label) ·
  `endorsements` (skill, count, from_user) · `references` (paragraph recs via
  shareable link — works pre-launch as a growth hook)
- `screens` (from, to, cover_letter, status) · `matches` (+ pipeline_stage) ·
  `messages` (Realtime channel per match) · `rejection_letters`
- `blocks` · `reports` · `entitlements` (RevenueCat webhook) · `devices`
  (push tokens)

Key RLS rule: resume PDFs downloadable only by matched users (signed URLs
gated on an existing match).
