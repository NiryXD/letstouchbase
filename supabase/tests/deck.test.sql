-- ─── [Opus 4.8] Authored by Claude Opus 4.8 in this session (test layer) ─────
-- pgTAP deck-ranking suite. Guards the re-declared ltb_deck_candidates: mutual
-- eligibility still works, and an active Expedited Review (boost) sorts first.
-- ltb_deck_candidates is owner-only (revoked from anon/authenticated), so this
-- runs in the default superuser context — no role switch.
-- Run: supabase test db

begin;
select plan(3);

-- viewer V (woman seeking men) + two eligible men X, Y, all co-located.
insert into profiles (user_id, first_name, birthdate, gender, location) values
  ('user_v', 'Vee', '1995-01-01', 'woman', 'SRID=4326;POINT(0 0)'::geography),
  ('user_x', 'Ex',  '1994-01-01', 'man',   'SRID=4326;POINT(0 0)'::geography),
  ('user_y', 'Why', '1993-01-01', 'man',   'SRID=4326;POINT(0 0)'::geography);

insert into preferences (user_id, genders, age_min, age_max, max_distance_km) values
  ('user_v', '{man}',   18, 99, 50),
  ('user_x', '{woman}', 18, 99, 50),
  ('user_y', '{woman}', 18, 99, 50);

-- both candidates are mutually eligible and surface in V's deck
select is(
  (select count(*) from ltb_deck_candidates('user_v', 1, 30))::int, 2,
  'mutually-eligible candidates appear in the deck'
);

-- without a boost, neither dominates by a full point
select ok(
  abs(
    coalesce((select score from ltb_deck_candidates('user_v', 1, 30) where uid = 'user_y'), 0)
    - coalesce((select score from ltb_deck_candidates('user_v', 1, 30) where uid = 'user_x'), 0)
  ) < 1.0,
  'unboosted candidates score within the normalized band'
);

-- activate a boost on Y → Y must outrank X (boost adds +1.0, dominating jitter)
update profiles set boosted_until = now() + interval '10 minutes' where user_id = 'user_y';
select ok(
  (select score from ltb_deck_candidates('user_v', 1, 30) where uid = 'user_y')
  > (select score from ltb_deck_candidates('user_v', 1, 30) where uid = 'user_x'),
  'an active Expedited Review pins the resume to the top of the stack'
);

select * from finish();
rollback;
