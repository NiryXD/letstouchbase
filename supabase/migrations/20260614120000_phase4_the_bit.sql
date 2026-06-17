-- ─── [Opus 4.8] Authored by Claude Opus 4.8 in this session ────────────────
-- Phase 4 — "The Bit": Exit Interviews, Endorsements, Quarterly Performance
-- Review. Same security posture as the rest of the schema: deny-by-default RLS,
-- SECURITY DEFINER functions with a pinned search_path, and viewer identity
-- always taken from ltb_uid() (the verified Clerk JWT) — never from arguments.
--
-- Timestamp-named (per supabase-gotchas) so it sorts after the applied
-- 20260612* remote migrations instead of ahead of them.

-- ---------------------------------------------------------------------------
-- Exit Interviews — the "We Met" feedback loop (docs/plan/01).
-- One per (match, user): each party files their own confidential review.
-- ---------------------------------------------------------------------------
create table exit_interviews (
  id         bigint generated always as identity primary key,
  match_id   uuid not null references matches on delete cascade,
  user_id    text not null references profiles on delete cascade,
  -- did the alignment call convert to an in-person Final Round?
  met        boolean not null,
  -- how'd it go? (mirrors EXIT_OUTCOMES in packages/shared/src/taxonomies.ts)
  outcome    text not null check (outcome in ('great','fine','poor','no_show')),
  note       text check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  unique (match_id, user_id)
);
create index exit_interviews_user_idx on exit_interviews (user_id);

alter table exit_interviews enable row level security;

-- Owner-only, and only for a match you are actually a party to. Reviews are
-- never readable by the other side — confidential, like the feature promises.
create policy exit_interviews_owner on exit_interviews for all to authenticated
  using (user_id = ltb_uid())
  with check (
    user_id = ltb_uid()
    and exists (
      select 1 from matches m
      where m.id = match_id and (m.user_a = ltb_uid() or m.user_b = ltb_uid())
    )
  );

-- ---------------------------------------------------------------------------
-- Endorsements — colleagues vouch for a core competency. The table already
-- exists (initial schema) with read + owner-delete policies; it was missing an
-- INSERT policy, so no one could actually endorse anyone. Add one, gated on a
-- live match: you may only endorse people you've matched with, and only as
-- yourself. The unique(user_id, skill, endorser_id) constraint already caps it
-- at one endorsement per skill per colleague.
-- ---------------------------------------------------------------------------
create policy endorsements_insert on endorsements for insert to authenticated
  with check (
    endorser_id = ltb_uid()
    and endorser_id <> user_id
    and ltb_is_matched(ltb_uid(), user_id)
  );

-- ---------------------------------------------------------------------------
-- Endorsement tallies on the resume card. Re-declare ltb_profile_card to add
-- an aggregated `endorsements` array (skill + count), highest-vouched first.
-- (Function body otherwise identical to migration 3.)
-- ---------------------------------------------------------------------------
create or replace function ltb_profile_card(uid text) returns jsonb
  language sql stable security definer
  set search_path = public, extensions
  as $$
    select jsonb_build_object(
      'userId', p.user_id,
      'firstName', p.first_name,
      'age', ltb_age(p.birthdate),
      'headline', p.headline,
      'executiveSummary', p.executive_summary,
      'currentTitle', p.current_title,
      'employer', p.employer,
      'industry', p.industry,
      'archetype', p.archetype,
      'openToWork', p.open_to_work,
      'outOfOffice', p.out_of_office,
      'photos', coalesce((
        select jsonb_agg(jsonb_build_object('id', ph.id, 'slot', ph.slot, 'path', ph.storage_path) order by ph.position)
        from photos ph where ph.user_id = p.user_id), '[]'::jsonb),
      'answers', coalesce((
        select jsonb_agg(jsonb_build_object('id', ba.id, 'question', ba.question, 'answer', ba.answer) order by ba.position)
        from behavioral_answers ba where ba.user_id = p.user_id), '[]'::jsonb),
      'experience', coalesce((
        select jsonb_agg(jsonb_build_object('id', ex.id, 'title', ex.title, 'company', ex.company,
          'industry', ex.industry, 'startYear', ex.start_year, 'endYear', ex.end_year, 'oneLiner', ex.one_liner)
          order by ex.position)
        from experience ex where ex.user_id = p.user_id), '[]'::jsonb),
      'education', coalesce((
        select jsonb_agg(jsonb_build_object('id', ed.id, 'school', ed.school, 'degreeLevel', ed.degree_level,
          'field', ed.field, 'classYear', ed.class_year) order by ed.position)
        from education ed where ed.user_id = p.user_id), '[]'::jsonb),
      'references', coalesce((
        select jsonb_agg(jsonb_build_object('id', rl.id, 'authorName', rl.author_name,
          'relationship', rl.relationship, 'body', rl.body) order by rl.created_at)
        from reference_letters rl where rl.user_id = p.user_id and rl.is_approved), '[]'::jsonb),
      'endorsements', coalesce((
        select jsonb_agg(jsonb_build_object('skill', e.skill, 'count', e.cnt) order by e.cnt desc, e.skill)
        from (
          select skill, count(*)::int as cnt
          from endorsements where user_id = p.user_id
          group by skill
        ) e), '[]'::jsonb)
    )
    from profiles p where p.user_id = uid
  $$;

revoke execute on function ltb_profile_card(text) from anon;

-- ---------------------------------------------------------------------------
-- Quarterly Performance Review — the caller's own funnel metrics, computed
-- from existing tables (no new tracking infra). SECURITY DEFINER so it can read
-- across the funnel, but every clause is scoped to ltb_uid(): a user can only
-- ever pull their own numbers.
-- ---------------------------------------------------------------------------
create or replace function ltb_performance_review() returns jsonb
  language plpgsql stable security definer
  set search_path = public, extensions
  as $$
declare
  me text := ltb_uid();
begin
  if me is null then raise exception 'unauthenticated'; end if;
  return jsonb_build_object(
    'impressions',     coalesce((select sum(count) from impressions where viewed = me), 0),
    'screensReceived', (select count(*) from screens where to_user = me),
    'screensPending',  (select count(*) from screens where to_user = me and status = 'pending'),
    'screensSent',     (select count(*) from screens where from_user = me),
    'screensAccepted', (select count(*) from screens where from_user = me and status = 'accepted'),
    'offers',          (select count(*) from matches where user_a = me or user_b = me),
    'activeOffers',    (select count(*) from matches where (user_a = me or user_b = me) and ended_at is null),
    'endorsements',    (select count(*) from endorsements where user_id = me),
    'references',      (select count(*) from reference_letters where user_id = me and is_approved),
    'desirability',    (select desirability from profiles where user_id = me),
    'completeness',    (select completeness from profiles where user_id = me),
    'memberSince',     (select created_at from profiles where user_id = me)
  );
end;
$$;

revoke execute on function ltb_performance_review() from anon;
