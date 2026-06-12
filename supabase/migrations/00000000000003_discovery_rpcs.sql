-- Discovery + funnel server logic as SECURITY DEFINER RPCs.
-- Deviation from doc 08 (noted there): get-deck / request-screen /
-- decide-screen / block-user run as Postgres functions instead of Edge
-- Functions. Same server-side enforcement (viewer identity always from
-- ltb_uid(), never from arguments); Edge Functions remain for external
-- API work (push dispatch, account deletion, webhooks) in Phase 3+.

-- ---------------------------------------------------------------------------
-- helpers
-- ---------------------------------------------------------------------------
create or replace function ltb_age(d date) returns int
  language sql stable
  as $$ select date_part('year', age(d))::int $$;

-- mirrors DEGREE_RANK in packages/shared/src/taxonomies.ts
create or replace function ltb_degree_rank(level text) returns int
  language sql immutable
  as $$
    select case level
      when 'High School' then 0
      when 'Self-Taught' then 0
      when 'Trade Certification' then 1
      when 'Associate' then 1
      when 'Bachelor''s' then 2
      when 'Master''s' then 3
      when 'MBA' then 3
      when 'JD' then 4
      when 'MD' then 4
      when 'PhD' then 4
      else 0
    end
  $$;

-- full resume card for the client (photos interleave client-side)
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
        from education ed where ed.user_id = p.user_id), '[]'::jsonb)
    )
    from profiles p where p.user_id = uid
  $$;

-- ---------------------------------------------------------------------------
-- eligibility + Recruiter Score (docs/plan/05). radius_mult > 1 = widened.
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
      + 0.10 * random() )::real as score
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

-- ---------------------------------------------------------------------------
-- get_deck: Recruiter's Pick + ranked batch + impressions + widening
-- ---------------------------------------------------------------------------
create or replace function ltb_get_deck(batch int default 30) returns jsonb
  language plpgsql security definer
  set search_path = public, extensions
  as $$
declare
  me text := ltb_uid();
  widened boolean := false;
  ids text[];
  pick text;
  served text[];
begin
  if me is null then raise exception 'unauthenticated'; end if;

  update profiles set last_active_at = now() where user_id = me;

  select dp.pick_user_id into pick
    from daily_picks dp where dp.user_id = me and dp.day = current_date;
  if pick is null then
    select t.uid into pick from ltb_deck_candidates(me, 1, 1) t;
    if pick is not null then
      insert into daily_picks (user_id, day, pick_user_id)
      values (me, current_date, pick)
      on conflict do nothing;
    end if;
  end if;

  select coalesce(array_agg(t.uid), '{}') into ids
    from ltb_deck_candidates(me, 1, batch) t;
  if coalesce(array_length(ids, 1), 0) = 0 then
    select coalesce(array_agg(t.uid), '{}') into ids
      from ltb_deck_candidates(me, 3, batch) t;
    widened := true;
  end if;

  served := ids || case when pick is null then '{}'::text[] else array[pick] end;
  if coalesce(array_length(served, 1), 0) > 0 then
    insert into impressions (viewer, viewed)
    select me, s from unnest(served) as s
    on conflict (viewer, viewed)
      do update set count = impressions.count + 1, last_seen_at = now();
  end if;

  return jsonb_build_object(
    'widened', widened,
    'pick', case when pick is null then null else ltb_profile_card(pick) end,
    'candidates', coalesce(
      (select jsonb_agg(ltb_profile_card(t.u) order by t.ord)
       from unnest(ids) with ordinality as t(u, ord)),
      '[]'::jsonb)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- request_screen: the "like". Counter/credits enforced here (doc 08 #2).
-- Raises 'DAILY_LIMIT' past 8/day for non-executives (UTC day).
-- ---------------------------------------------------------------------------
create or replace function ltb_request_screen(
  target text,
  letter text,
  annotated_kind text default null,
  annotated_id text default null,
  headhunt boolean default false
) returns jsonb
  language plpgsql security definer
  set search_path = public, extensions
  as $$
declare
  me text := ltb_uid();
  existing screens%rowtype;
  cnt int;
begin
  if me is null then raise exception 'unauthenticated'; end if;
  if target = me then raise exception 'cannot screen yourself'; end if;
  if letter is null or length(trim(letter)) = 0 or length(letter) > 280 then
    raise exception 'cover letter required (max 280 chars)';
  end if;
  if not exists (select 1 from profiles where user_id = target and is_paused = false) then
    raise exception 'candidate unavailable';
  end if;
  if exists (select 1 from blocks b
      where (b.blocker = me and b.blocked = target)
         or (b.blocker = target and b.blocked = me)) then
    raise exception 'candidate unavailable';
  end if;
  if exists (select 1 from matches m
      where m.user_a = least(me, target) and m.user_b = greatest(me, target)
        and m.ended_at is null) then
    raise exception 'already matched';
  end if;

  select * into existing from screens s where s.from_user = me and s.to_user = target;
  if found and not (existing.status = 'rejected'
                    and existing.decided_at < now() - interval '30 days') then
    raise exception 'application already on file';
  end if;

  if headhunt then
    update entitlements set headhunt_credits = headhunt_credits - 1, updated_at = now()
      where user_id = me and headhunt_credits > 0;
    if not found then raise exception 'no headhunt credits'; end if;
  else
    insert into screen_counters (user_id, day, count)
    values (me, (now() at time zone 'utc')::date, 1)
    on conflict (user_id, day) do update set count = screen_counters.count + 1
    returning count into cnt;
    if cnt > 8 and not coalesce(
        (select is_executive from entitlements where user_id = me), false) then
      raise exception 'DAILY_LIMIT';  -- rolls back the increment
    end if;
  end if;

  insert into screens (from_user, to_user, status, cover_letter,
                       annotated_kind, annotated_id, is_headhunt)
  values (me, target, 'pending', letter, annotated_kind, annotated_id, headhunt)
  on conflict (from_user, to_user) do update
    set status = 'pending', cover_letter = excluded.cover_letter,
        annotated_kind = excluded.annotated_kind, annotated_id = excluded.annotated_id,
        is_headhunt = excluded.is_headhunt, created_at = now(), decided_at = null;

  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- decide_screen: inbound accept → match; reject → optional rejection letter
-- ---------------------------------------------------------------------------
create or replace function ltb_decide_screen(
  screen_id bigint,
  decision text,
  letter text default null
) returns jsonb
  language plpgsql security definer
  set search_path = public, extensions
  as $$
declare
  me text := ltb_uid();
  s screens%rowtype;
  mid uuid;
begin
  if me is null then raise exception 'unauthenticated'; end if;
  if decision not in ('accepted', 'rejected') then raise exception 'bad decision'; end if;

  select * into s from screens
    where id = screen_id and to_user = me and status = 'pending';
  if not found then raise exception 'screen not found or already decided'; end if;

  update screens set status = decision, decided_at = now() where id = screen_id;

  if decision = 'accepted' then
    insert into matches (user_a, user_b)
    values (least(s.from_user, me), greatest(s.from_user, me))
    on conflict (user_a, user_b)
      do update set ended_at = null, ended_by = null  -- accepting again revives a terminated pair
    returning id into mid;
    return jsonb_build_object('ok', true, 'matchId', mid);
  else
    insert into rejects (from_user, to_user) values (me, s.from_user)
      on conflict do nothing;
    if letter is not null and length(trim(letter)) > 0 then
      insert into rejection_letters (from_user, to_user, body, context)
      values (me, s.from_user, letter, 'screen');
    end if;
    return jsonb_build_object('ok', true);
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- block_user: block + terminate active match + clear pending screens
-- ---------------------------------------------------------------------------
create or replace function ltb_block_user(target text) returns void
  language plpgsql security definer
  set search_path = public, extensions
  as $$
declare
  me text := ltb_uid();
begin
  if me is null then raise exception 'unauthenticated'; end if;
  insert into blocks (blocker, blocked) values (me, target) on conflict do nothing;
  update matches set ended_at = now(), ended_by = me
    where user_a = least(me, target) and user_b = greatest(me, target)
      and ended_at is null;
  delete from screens
    where ((from_user = me and to_user = target)
        or (from_user = target and to_user = me))
      and status = 'pending';
end;
$$;

-- deck passes ("Reject Candidate" on the Candidates tab) are client-direct
create policy rejects_insert on rejects for insert to authenticated
  with check (from_user = ltb_uid());

-- internal helpers are not for direct client use
revoke execute on function ltb_deck_candidates(text, numeric, int) from public, anon, authenticated;
revoke execute on function ltb_profile_card(text) from anon;
revoke execute on function ltb_get_deck(int) from anon;
revoke execute on function ltb_request_screen(text, text, text, text, boolean) from anon;
revoke execute on function ltb_decide_screen(bigint, text, text) from anon;
revoke execute on function ltb_block_user(text) from anon;
