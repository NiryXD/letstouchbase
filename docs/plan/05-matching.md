# 05 · Matching, Screens & Notifications

## Geo (v1)

`profiles.location` as a PostGIS geography point (PostGIS ships with Supabase)
with a GIST index. Location refreshes on app open; Business Trip mode
overrides the stored point. Candidate query uses the **mutual** radius — each
person must be inside the other's distance preference.

## Candidate pool

Mutually compatible on gender/age/distance + passes both sides' Dealbreakers,
excluding matched, blocked, and recently-seen users. Rejected profiles recycle
back into the deck after 30 days (Hinge does this; essential in thin markets).
Deck fetched in batches of ~30 via an Edge Function, cached client-side with
TanStack Query.

## Ranking — "Recruiter Score" (v1, explainable, no ML)

```
score = 0.35·activity + 0.25·band + 0.20·completeness + 0.10·fresh + 0.10·jitter
```

- **activity:** decay on days-since-last-open (active today = 1.0, dormant
  2 weeks ≈ 0). Dead profiles kill dating apps faster than bad matches.
- **band (ELO-lite):** desirability `d` = Bayesian-smoothed incoming
  screens-per-impression, `(screens + a) / (impressions + a + b)`, so new
  users aren't punished by tiny samples. Band score =
  `1 − |d_viewer − d_candidate|` — people see others in a similar reciprocity
  band, which is most of what dating-app "ELO" actually is. One column,
  recomputed nightly (pg_cron + Edge Function).
- **completeness:** all photo slots + 3 behavioral answers + education filled
  outranks skeletons; doubles as the onboarding incentive.
- **fresh:** temporary new-hire visibility boost (first 7 days).
- **jitter:** small random term so the deck never feels deterministic and
  low-band users still surface.

**Recruiter's Pick:** the day's single highest mutual-fit candidate (jitter
excluded), pinned at the top of Candidates, excluded from the regular deck
that day.

**Inbound ordering:** free = strictly newest-first, one at a time (blurred);
premium = full grid, jump anywhere. Headhunts always pin to the top of the
recipient's inbound queue regardless of tier.

## Cold start

When the mutual-radius pool runs dry, progressively widen the radius (with an
"expanding your search area" notice) before showing the empty state ("**We're
still hiring in your area** — refer a colleague"). Seeded friend cohort at
launch; niche-first metro strategy keeps density survivable.

## Limits & integrity

The 8/day counter, premium bypass, and Headhunt spending all live server-side
in the Edge Function that records screens — never trust the client. Log every
impression/screen/reject/match/message to PostHog from day one.

## v2 (post-launch, own phase, needs real data)

Hinge's actual edge is a Gale–Shapley-inspired "Most Compatible" recommender
trained on like patterns. Do not build ML against zero users; the day-one
event instrumentation is what makes v2 possible later.

## App screen map

Four tabs (Hinge's proven information architecture, renamed):

1. **Candidates** — Recruiter's Pick pinned on top, then one scrollable Resume
   card at a time; tap any line/photo → Cover Letter composer.
2. **Inbound** — the Applications grid (blurred for free, newest-first queue).
3. **Pipeline** — matches as kanban columns + Alignment Call (chat) threads;
   Action Required badge counts pending replies.
4. **Your Resume** — own profile editor, photo slots, Resume on File,
   Open-to-Work status, Hiring Criteria, Quarterly Performance Review, Out of
   Office, settings, Upgrade Your Seat.

Modal flows: onboarding wizard ("Build Your Resume"), Cover Letter composer,
Offer Extended celebration, Formal Rejection Letter composer, Exit Interview
prompt, report/block, paywall.

## Notifications (the retention engine, in corporate voice)

- "**You have a new inbound application**" — someone screened you
- "**Offer extended!** Schedule your alignment call with [Name]." — match
- "**New message from [Name] re: your alignment call**" — chat
- "**Action required:** [Name] has been awaiting your decision for 24 hours."
  — anti-ghosting nudge (Hinge's "Your Turn")
- "**Your Recruiter's Pick for today is in.**" — daily, opt-out-able

Granular per-category settings + quiet hours from day one; nothing erodes
trust faster than spammy dating-app pushes.
