-- ─── [Opus 4.8] Authored by Claude Opus 4.8 in this session (Phase 5) ───────
-- Expedited Review (the "boost" consumable). Credits were already granted by
-- ltb_grant_credits (entitlement helpers) but nothing consumed them or moved a
-- resume up the stack — a dead feature. This closes it: a boost window on the
-- profile, an RPC to spend a credit, and a ranking term so boosted resumes
-- surface at the top of every eligible viewer's deck.
--
-- Same posture as the rest of the schema: SECURITY DEFINER + pinned
-- search_path, identity always from ltb_uid(), full-table guards where needed.

alter table profiles add column if not exists boosted_until timestamptz;

-- ---------------------------------------------------------------------------
-- Spend one Expedited Review credit → a 30-minute visibility window. Atomic:
-- the credit is only consumed if one is available (where boost_credits > 0).
-- ---------------------------------------------------------------------------
create or replace function ltb_activate_boost() returns jsonb
  language plpgsql security definer
  set search_path = public, extensions
  as $$
declare
  me text := ltb_uid();
  until timestamptz := now() + interval '30 minutes';
begin
  if me is null then raise exception 'unauthenticated'; end if;

  update entitlements
    set boost_credits = boost_credits - 1, updated_at = now()
    where user_id = me and boost_credits > 0;
  if not found then raise exception 'no boost credits'; end if;

  -- extend, don't truncate, an already-active boost
  update profiles
    set boosted_until = greatest(coalesce(boosted_until, now()), until)
    where user_id = me
    returning boosted_until into until;

  return jsonb_build_object('ok', true, 'boostedUntil', until);
end;
$$;

revoke execute on function ltb_activate_boost() from anon;

-- ---------------------------------------------------------------------------
-- Re-declare ltb_deck_candidates (verbatim from migration 3) with one added
-- ranking term: an active boost adds +1.0, which dominates the normalized
-- 0..1 base score — "your resume moves to the top of the stack."
-- ---------------------------------------------------------------------------
create or replace function ltb_deck_candidates(me text, radius_mult numeric, lim int)
  returns table(uid text, score real)
  language sql stable security definer
  set search_path = public, extensions
  as $$
    select c.user_id,
      ( 0.35 * greatest(0, 1 - extract(epoch from (now() - c.last_active_at)) / (14 * 86400))
      + 0.25 * (1 - abs(v.desirability - c.desirability))
      + 0.20 * c.completeness
      + 0.10 * (c.created_at > now() - interval '7 days')::int
      + 0.10 * random()
      -- [Opus 4.8] Expedited Review: pin active boosts to the top of the deck
      + case when c.boosted_until > now() then 1.0 else 0 end )::real as score
    from profiles v
    join preferences vp on vp.user_id = v.user_id
    cross join profiles c
    join preferences cp on cp.user_id = c.user_id
    where v.user_id = me
      and c.user_id <> me
      and c.is_paused = false
      and v.location is not null and c.location is not null
      and st_dwithin(v.location, c.location,
            least(vp.max_distance_km, cp.max_distance_km) * 1000 * radius_mult)
      -- mutual gender + age
      and c.gender = any(vp.genders)
      and v.gender = any(cp.genders)
      and ltb_age(c.birthdate) between vp.age_min and vp.age_max
      and ltb_age(v.birthdate) between cp.age_min and cp.age_max
      -- viewer's Minimum Qualifications (dealbreakers)
      and (not vp.industries_db   or vp.industries   is null or c.industry     = any(vp.industries))
      and (not vp.archetypes_db   or vp.archetypes   is null or c.archetype    = any(vp.archetypes))
      and (not vp.open_to_work_db or vp.open_to_work is null or c.open_to_work = any(vp.open_to_work))
      and (not vp.ethnicities_db  or vp.ethnicities  is null or c.ethnicity    = any(vp.ethnicities))
      and (not vp.religions_db    or vp.religions    is null or c.religion     = any(vp.religions))
      and (not vp.family_plans_db or vp.family_plans is null or c.family_plans = any(vp.family_plans))
      and (not vp.has_kids_db     or vp.has_kids     is null or c.has_kids     = any(vp.has_kids))
      and (not vp.smoking_db      or vp.smoking      is null or c.smoking      = any(vp.smoking))
      and (not vp.drinking_db     or vp.drinking     is null or c.drinking     = any(vp.drinking))
      and (not vp.cannabis_db     or vp.cannabis     is null or c.cannabis     = any(vp.cannabis))
      and (not vp.politics_db     or vp.politics     is null or c.politics     = any(vp.politics))
      and (not vp.height_db or vp.height_min_cm is null
           or c.height_cm between vp.height_min_cm and vp.height_max_cm)
      and (not vp.degree_db or vp.min_degree_rank is null
           or (select max(ltb_degree_rank(ed.degree_level)) from education ed
               where ed.user_id = c.user_id) >= vp.min_degree_rank)
      -- candidate's Minimum Qualifications (mirror)
      and (not cp.industries_db   or cp.industries   is null or v.industry     = any(cp.industries))
      and (not cp.archetypes_db   or cp.archetypes   is null or v.archetype    = any(cp.archetypes))
      and (not cp.open_to_work_db or cp.open_to_work is null or v.open_to_work = any(cp.open_to_work))
      and (not cp.ethnicities_db  or cp.ethnicities  is null or v.ethnicity    = any(cp.ethnicities))
      and (not cp.religions_db    or cp.religions    is null or v.religion     = any(cp.religions))
      and (not cp.family_plans_db or cp.family_plans is null or v.family_plans = any(cp.family_plans))
      and (not cp.has_kids_db     or cp.has_kids     is null or v.has_kids     = any(cp.has_kids))
      and (not cp.smoking_db      or cp.smoking      is null or v.smoking      = any(cp.smoking))
      and (not cp.drinking_db     or cp.drinking     is null or v.drinking     = any(cp.drinking))
      and (not cp.cannabis_db     or cp.cannabis     is null or v.cannabis     = any(cp.cannabis))
      and (not cp.politics_db     or cp.politics     is null or v.politics     = any(cp.politics))
      and (not cp.height_db or cp.height_min_cm is null
           or v.height_cm between cp.height_min_cm and cp.height_max_cm)
      and (not cp.degree_db or cp.min_degree_rank is null
           or (select max(ltb_degree_rank(ed.degree_level)) from education ed
               where ed.user_id = v.user_id) >= cp.min_degree_rank)
      -- exclusions (doc 08, get-deck)
      and not exists (select 1 from matches m
        where m.user_a = least(me, c.user_id) and m.user_b = greatest(me, c.user_id))
      and not exists (select 1 from blocks b
        where (b.blocker = me and b.blocked = c.user_id)
           or (b.blocker = c.user_id and b.blocked = me))
      and not exists (select 1 from screens s
        where s.from_user = me and s.to_user = c.user_id
          and (s.status = 'pending'
               or (s.status = 'rejected' and s.decided_at > now() - interval '30 days')))
      and not exists (select 1 from rejects r
        where r.from_user = me and r.to_user = c.user_id)
      and not exists (select 1 from impressions i
        where i.viewer = me and i.viewed = c.user_id
          and i.last_seen_at > now() - interval '3 days')
      and not exists (select 1 from daily_picks dp
        where dp.user_id = me and dp.day = current_date and dp.pick_user_id = c.user_id)
    order by 2 desc
    limit lim
  $$;

revoke execute on function ltb_deck_candidates(text, numeric, int) from public, anon, authenticated;
