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

## Run

```bash
supabase test db
```

This applies every migration to a throwaway local database and runs each file
in a rolled-back transaction (requires Docker + the Supabase CLI). Add to CI
once Docker-in-CI is worthwhile:

```yaml
  db-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
      - run: supabase db start
      - run: supabase test db
```

The Edge Functions' pure logic is covered separately by Deno unit tests
(`supabase/functions/_shared/*.test.ts`), which run in CI on every push.
