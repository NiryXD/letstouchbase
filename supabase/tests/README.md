# Database tests (pgTAP)

[Opus 4.8] Security + ranking tests that run against the real schema.

These verify the things that are easy to break silently:

- **`security.test.sql`** — RLS isolation (you can't read another user's exit
  interviews, notification prefs, etc.), the matched-only endorsement insert,
  `ltb_performance_review` self-scoping, and `ltb_activate_boost` credit
  accounting.
- **`deck.test.sql`** — `ltb_deck_candidates` still surfaces mutually-eligible
  candidates after the Phase 5 re-declare, and an active Expedited Review
  (boost) pins a resume to the top of the deck.
- **`hardening.test.sql`** — the 2026-07-06 security audit regressions: a client
  cannot self-grant a boost or inflate `desirability` (profiles column grants),
  cannot rewrite a match counterparty to fabricate a match / reach a stranger's
  private résumé (matches column grants), cannot move the counterparty's
  pipeline stage (trigger), and cannot silently edit a sent message body
  (messages column grant). Legitimate self-edits, own-stage moves, and retract
  still pass.

## Run

```bash
supabase test db
```

This applies every migration to a throwaway local database and runs each file
in a rolled-back transaction (requires Docker + the Supabase CLI). **This now
runs in CI** on every push via the `db-tests` job in
`.github/workflows/ci.yml` (`supabase db start` → `supabase test db`).

The Edge Functions' pure logic is covered separately by Deno unit tests
(`supabase/functions/_shared/*.test.ts`), which run in CI on every push.
