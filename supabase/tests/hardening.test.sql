-- ─── Security-hardening regression suite (2026-07-06 audit) ─────────────────
-- Proves the column-grant + trigger fixes in
-- 20260706120000_harden_update_grants.sql actually hold under the RLS role.
-- These guard the two privilege-escalation findings (free self-boost via
-- profiles; match fabrication / résumé theft via matches) plus message
-- immutability. Run: supabase test db

begin;
select plan(11);

-- ── Setup as owner (RLS + column grants bypassed) ───────────────────────────
-- A and B are matched; C is a stranger. Give C a résumé PDF path so we can
-- prove an attacker can't fabricate a match to reach it.
insert into profiles (user_id, first_name, birthdate, gender, resume_pdf_path)
values ('user_a', 'Ana',  '1995-01-01', 'woman',     null),
       ('user_b', 'Ben',  '1994-01-01', 'man',       null),
       ('user_c', 'Cleo', '1993-01-01', 'nonbinary', 'user_c/resume.pdf');

insert into matches (user_a, user_b) values ('user_a', 'user_b');
insert into messages (match_id, sender, body)
select id, 'user_a', 'per my last email' from matches where user_a = 'user_a';

-- a reference someone filed about user_a (awaiting approval)
insert into reference_letters (user_id, author_name, body, is_approved)
values ('user_a', 'A Former Manager', 'They were fine, I guess.', false);

-- ── Act as user_a under RLS ─────────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_a","role":"authenticated"}', true);

-- 1-2. profiles: server-owned columns are not client-writable (free boost /
-- ranking manipulation is blocked at the grant layer → 42501).
select throws_ok(
  $$ update profiles set boosted_until = now() + interval '30 days' where user_id = 'user_a' $$,
  '42501', null,
  'cannot self-grant an Expedited Review boost (boosted_until locked)'
);
select throws_ok(
  $$ update profiles set desirability = 1.0 where user_id = 'user_a' $$,
  '42501', null,
  'cannot inflate own desirability score'
);

-- 3. profiles: legitimate self-edits still work.
select lives_ok(
  $$ update profiles set out_of_office = true, headline = 'Chief Vibes Officer' where user_id = 'user_a' $$,
  'can still edit own editable profile fields'
);

-- 4. matches: cannot rewrite the counterparty (the résumé-theft vector). C is
-- a stranger; forging (user_a=me, user_b=C) would make ltb_is_matched true.
select throws_ok(
  $$ update matches set user_b = 'user_c' where user_a = 'user_a' $$,
  '42501', null,
  'cannot rewrite a match counterparty (no fabricated matches)'
);

-- 5. and so a stranger's private résumé stays unreachable.
select is(
  ltb_is_matched('user_a', 'user_c'), false,
  'attacker is still not matched with the résumé owner'
);

-- 6. matches: can move OWN pipeline stage.
select lives_ok(
  $$ update matches set stage_a = 'initial_screen' where user_a = 'user_a' $$,
  'can advance own kanban stage'
);

-- 7. matches: cannot move the COUNTERPARTY's stage (trigger → check_violation).
select throws_ok(
  $$ update matches set stage_b = 'final_round' where user_a = 'user_a' $$,
  '23514', null,
  'cannot move the counterparty''s pipeline stage'
);

-- 8. messages: retract is allowed (only the flag changes).
select lives_ok(
  $$ update messages set retracted = true where sender = 'user_a' $$,
  'can retract own statement'
);

-- 9. messages: cannot silently edit the body after sending.
select throws_ok(
  $$ update messages set body = 'rewritten history' where sender = 'user_a' $$,
  '42501', null,
  'cannot tamper with a sent message body'
);

-- 10. reference_letters: the subject can approve/hide (curate visibility).
select lives_ok(
  $$ update reference_letters set is_approved = true where user_id = 'user_a' $$,
  'can approve a reference filed about you'
);

-- 11. reference_letters: but cannot rewrite the author's words.
select throws_ok(
  $$ update reference_letters set body = 'They were AMAZING and also very tall.' where user_id = 'user_a' $$,
  '42501', null,
  'cannot rewrite the author''s reference text'
);

select * from finish();
rollback;
