# 08 · Backend Contracts: Who Writes What

Every mutation in LTB is either a **client-direct write under RLS** (anon key
+ Clerk JWT) or one of **seven Edge Functions** (service role). Nothing else
touches the database. This doc is the contract; if a phase needs a write path
that isn't here, stop and add it here first.

```
client (RLS, anon key)                Edge Functions (service role)
──────────────────────                ─────────────────────────────
profiles/education/experience/        get-deck           ranked candidate batch
photos/behavioral/preferences  ─┐     request-screen     the "like" (8/day lives here)
messages (insert/retract)       │     decide-screen      accept → match / reject
matches.stage_x (own side)      │     block-user         block + end match
blocks*/reports/devices         │     delete-account     full wipe + Clerk delete
reference approval/delete       │     submit-reference   external, token-gated
                                │     revenuecat-webhook entitlements upsert
        reads everything else ──┘
        (* simple blocks insert is client-direct; block-user wraps it
           when an active match must also be terminated)
```

> **Implementation note (migration 3):** `get-deck`, `request-screen`,
> `decide-screen`, and `block-user` are implemented as SECURITY DEFINER
> Postgres RPCs (`ltb_get_deck`, `ltb_request_screen`, `ltb_decide_screen`,
> `ltb_block_user`) rather than Edge Functions. Identical server-side
> enforcement — viewer identity always derives from `ltb_uid()`, never from
> arguments — but testable without a Deno deploy and atomic by transaction.
> The contracts below still define their semantics. Edge Functions remain the
> plan for everything that calls external APIs: push dispatch (Phase 3),
> `delete-account` (Clerk API), `submit-reference`, `revenuecat-webhook`.
> Push notifications for screens/matches move to Database Webhooks on the
> `screens`/`matches` tables in Phase 3, unifying with chat dispatch.

## The seven Edge Functions

### 1. `get-deck`
- **Trigger:** Candidates tab load / pagination (TanStack Query).
- **Input:** none beyond the JWT (viewer id from `sub`).
- **Does:** runs the discovery query — mutually compatible on
  gender/age/mutual radius, passes **both** sides' Dealbreakers, excludes
  matched, blocked (either direction), pending outbound screens,
  `rejects` newer than 30 days, and `impressions.last_seen_at` within ~3 days;
  ranks by Recruiter Score (docs/plan/05); returns a batch of ~30.
- **Also:** upserts `impressions` (+1 count, bump `last_seen_at`) for every
  profile served; on an empty pool, progressively widens the radius and sets
  a `widened: true` flag so the client shows the "expanding your search
  area" notice; computes/returns the day's Recruiter's Pick, storing it in
  `daily_picks` (one per UTC day, excluded from the regular deck).

### 2. `request-screen`
- **Trigger:** Cover Letter composer submit.
- **Input:** `coverLetterSchema` from `@ltb/shared` (toUserId, annotatedItem,
  body, isHeadhunt).
- **Checks (server-side, in order):** target exists, not blocked either
  direction, not already matched; if `isHeadhunt`, decrement
  `entitlements.headhunt_credits` (reject if 0); otherwise increment
  `screen_counters` for today (**UTC date**) and reject past 8 unless
  `entitlements.is_executive`.
- **Writes:** **upserts** `screens (from_user, to_user)` — a stale `rejected`
  row (decided > 30 days ago) is overwritten back to `pending` with the new
  cover letter; this is how the unique constraint and the 30-day recycle
  coexist. Fresh rejections are not overwritable.
- **Push:** "You have a new inbound application" to the target's `devices`.

### 3. `decide-screen`
- **Trigger:** Inbound queue accept/reject.
- **Input:** `{ screenId, decision: "accepted" | "rejected", rejectionLetter? }`.
- **Accept:** set `screens.status/decided_at`; insert `matches` with
  `least(a,b), greatest(a,b)` (the `user_a < user_b` invariant), both stages
  `offer_extended`; push "Offer extended!" to **both** parties.
- **Reject:** set status; optionally insert `rejection_letters
  (context='screen')`; push only if a letter was sent.

### 4. `block-user`
- **Trigger:** block from a profile, screen, or chat.
- **Does:** insert into `blocks`, end any active match (`ended_at`,
  `ended_by`), and delete the pair's pending screens. RLS (migration 2) then
  hides the profiles from each other in both directions. Reports are a
  separate client-direct insert; the report sheet calls this function too
  when "also block" is checked.

### 5. `delete-account`  *(store-required — Phase 6 blocker)*
- **Trigger:** Settings → "Tender Your Resignation".
- **Does:** delete storage objects under `photos/{uid}/` and
  `resumes/{uid}/`, delete the `profiles` row (everything else cascades),
  then delete the Clerk user via the Clerk Backend API. Irreversible,
  confirm twice in UI.

### 6. `submit-reference`
- **Trigger:** the public reference form on `apps/web` (unauthenticated —
  this function uses the invite token as auth, not a JWT).
- **Input:** `{ token, authorName, relationship?, body (≤600) }`.
- **Does:** validate `reference_invites` token not expired, insert
  `reference_letters (is_approved=false)`, consume the token. Owner approves
  in-app before display (client-direct update under RLS).
- **Note:** this is `apps/web`'s first real feature — the web app must exist
  by Phase 4.

### 7. `revenuecat-webhook`
- **Trigger:** RevenueCat server events (auth: shared secret header).
- **Does:** upsert `entitlements` — `is_executive` from the subscription
  entitlement; `headhunt_credits`/`boost_credits` incremented on consumable
  purchases (weekly Executive Suite headhunt grant also lands here as a
  RevenueCat recurring entitlement or via `ltb_nightly`).

## Push notification dispatch

- **Chat messages:** Supabase **Database Webhook** on `messages` insert → a
  small dispatch function → Expo Push API ("New message from [Name] re: your
  alignment call"). Not needed until Phase 3.
- **Screens / matches:** emitted inline by `request-screen` /
  `decide-screen` (above).
- **Action Required / Recruiter's Pick daily:** scheduled later from
  `ltb_nightly` or a second cron job — Phase 3+, not v1-blocking.
- **Tokens:** client upserts `devices` (Expo push token, platform) on every
  app open. Per-category opt-outs + quiet hours are client-side preferences
  in v1, checked before sending where the category is known.

## Lifecycle invariants

- **Screen:** `pending → accepted | rejected`. Rejected recycles into the
  deck after 30 days (`rejects` purged nightly; stale screen rows
  overwritable by `request-screen`).
- **Match:** `user_a < user_b`, one row per pair ever active
  (`unique (user_a, user_b)` + `ended_at is null` partial indexes). Each
  side moves only its own `stage_a`/`stage_b` (client-direct; the app sends
  only its own column). Termination = `ended_at` + `ended_by`; chat insert
  policy already refuses ended matches.

## Pinned decisions (so we stop re-deciding)

| Decision | Call |
|---|---|
| Screen-counter day boundary | UTC date (`screen_counters.day`) — simple, predictable |
| Photos bucket | **Public-read in v1.** Tradeoff accepted: URLs are unguessable but shareable; revisit with signed URLs at scale |
| Resume PDFs | Private bucket, match-gated signed URLs (already in migration 1) |
| Blocks | Mutual invisibility enforced in RLS (migration 2), not just deck filtering |
| Recruiter's Pick | Stored in `daily_picks`, one per UTC day |
| Nightly recompute | Pure SQL `ltb_nightly()` via pg_cron — no pg_net, no Edge Function |
| Desirability window | Trailing 30 days, Bayesian prior a=3, b=15 |
