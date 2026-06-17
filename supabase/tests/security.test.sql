-- ─── [Opus 4.8] Authored by Claude Opus 4.8 in this session (test layer) ─────
-- pgTAP security suite: RLS isolation + RPC behavior. The crown jewels — these
-- protect the guarantees that are easy to break silently.
-- Run: supabase test db   (applies migrations, then this in a rolled-back txn)

begin;
select plan(10);

-- ── Setup as the owner (RLS bypassed) ───────────────────────────────────────
-- three users: A and B are matched; C is a stranger.
insert into profiles (user_id, first_name, birthdate, gender)
values ('user_a', 'Ana',  '1995-01-01', 'woman'),
       ('user_b', 'Ben',  '1994-01-01', 'man'),
       ('user_c', 'Cleo', '1993-01-01', 'nonbinary');

-- active match A↔B (user_a < user_b satisfies the check constraint)
insert into matches (user_a, user_b) values ('user_a', 'user_b');

-- each party files their own (confidential) exit interview
insert into exit_interviews (match_id, user_id, met, outcome)
select id, 'user_a', true, 'great' from matches where user_a = 'user_a';
insert into exit_interviews (match_id, user_id, met, outcome)
select id, 'user_b', false, 'no_show' from matches where user_a = 'user_a';

-- B has notification prefs; A has Expedited Review credits
insert into notification_prefs (user_id) values ('user_b');
insert into entitlements (user_id, boost_credits) values ('user_a', 2);

-- ── Act as user_a under RLS ─────────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_a","role":"authenticated"}', true);

select is(ltb_uid(), 'user_a', 'ltb_uid() resolves the JWT sub');

select is(
  (select count(*) from exit_interviews where user_id = 'user_b')::int, 0,
  'cannot read another user''s exit interview (RLS owner-only)'
);
select is(
  (select count(*) from exit_interviews where user_id = 'user_a')::int, 1,
  'can read own exit interview'
);
select is(
  (select count(*) from notification_prefs where user_id = 'user_b')::int, 0,
  'cannot read another user''s notification prefs'
);

-- endorsements: matched-only insert, enforced by RLS WITH CHECK
select throws_ok(
  $$ insert into endorsements (user_id, skill, endorser_id) values ('user_c', 'Synergy', 'user_a') $$,
  '42501',
  null,
  'cannot endorse a non-matched user'
);
select lives_ok(
  $$ insert into endorsements (user_id, skill, endorser_id) values ('user_b', 'Synergy', 'user_a') $$,
  'can endorse a matched user'
);

-- performance review is self-scoped and counts the A↔B match
select ok(
  (ltb_performance_review() ->> 'offers')::int >= 1,
  'performance review reports the user''s own offers'
);

-- Expedited Review: spend a credit, balance drops, raises when empty
select lives_ok($$ select ltb_activate_boost() $$, 'activate_boost succeeds with credits');
select is(
  (select boost_credits from entitlements where user_id = 'user_a'), 1,
  'activate_boost decrements the credit'
);

-- ── Act as user_b (no credits) ──────────────────────────────────────────────
select set_config('request.jwt.claims', '{"sub":"user_b","role":"authenticated"}', true);
select throws_ok(
  $$ select ltb_activate_boost() $$,
  'no boost credits',
  'activate_boost raises when out of credits'
);

select * from finish();
rollback;
