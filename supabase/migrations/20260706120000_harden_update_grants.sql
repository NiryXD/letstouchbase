-- ─── Security hardening — column-level write grants + integrity triggers ─────
-- Deep security audit (2026-07-06) finding. Two RLS UPDATE policies granted
-- row access with only a USING clause and no column constraint. Because
-- Supabase grants the `authenticated` role table-level INSERT/UPDATE (RLS is
-- meant to be the gate), a client could write columns the app never intends
-- to expose:
--
--   1. profiles — a user could self-set `boosted_until`, `desirability`,
--      `completeness`, `last_active_at`. Setting `boosted_until` to a future
--      time pins your résumé to the top of every eligible deck (the +1.0 term
--      in ltb_deck_candidates) — a FREE, PERMANENT Expedited Review, defeating
--      the Phase-5 paid consumable and skewing ranking for everyone.
--
--   2. matches — the `matches_stage` policy (USING user_a=me OR user_b=me, no
--      WITH CHECK) let a party REWRITE the counterparty: `update matches set
--      user_b = '<victim>'`. Postgres applies the USING expression as the
--      implicit WITH CHECK, and `user_a` stays = me, so the new row passes.
--      That fabricates an "active match" with an arbitrary user, which:
--        • lets the attacker insert `messages` to them (messages_send only
--          checks match membership), i.e. unsolicited messages bypassing consent;
--        • makes `ltb_is_matched(me, victim)` true, so the storage policy
--          `resumes_matched_read` mints a signed URL to the victim's PRIVATE
--          résumé PDF — a confidentiality break on the one truly private asset.
--
-- Root cause is the same for both: RLS can't express "these columns are
-- immutable / server-owned", and a WITH CHECK can't reference the OLD row.
-- The correct tool is column-level GRANTs (which Postgres *can* scope) backed
-- by BEFORE UPDATE triggers for the per-row invariants ("move only your own
-- pipeline stage", "a message is immutable once sent").
--
-- Timestamp-named per supabase-gotchas so it sorts after the applied set.

-- ---------------------------------------------------------------------------
-- 1. profiles — grant writes only on user-editable columns.
--    Server-owned (never client-writable): desirability, completeness,
--    last_active_at (nightly / get-deck), boosted_until (paid Expedited
--    Review via ltb_activate_boost), created_at. user_id is immutable after
--    insert. All the SECURITY DEFINER functions that legitimately touch these
--    (ltb_nightly, ltb_get_deck, ltb_activate_boost) run as the table owner
--    and are unaffected by these role grants.
--
--    Table-level privileges can't be "carved" a column at a time, so we revoke
--    the whole verb and re-grant the explicit allow-list.
-- ---------------------------------------------------------------------------
revoke insert, update on profiles from authenticated, anon;

-- editable at insert time (onboarding) — includes the identity column
grant insert (
  user_id, first_name, headline, executive_summary, current_title, employer,
  industry, archetype, open_to_work, birthdate, gender, height_cm, ethnicity,
  religion, family_plans, has_kids, smoking, drinking, cannabis, politics,
  location, is_business_trip, resume_pdf_path, out_of_office, is_paused
) on profiles to authenticated;

-- editable after onboarding (same set, minus the immutable user_id)
grant update (
  first_name, headline, executive_summary, current_title, employer,
  industry, archetype, open_to_work, birthdate, gender, height_cm, ethnicity,
  religion, family_plans, has_kids, smoking, drinking, cannabis, politics,
  location, is_business_trip, resume_pdf_path, out_of_office, is_paused
) on profiles to authenticated;

-- ---------------------------------------------------------------------------
-- 2. matches — grant UPDATE only on the mutable per-side columns. This alone
--    kills the counterparty-rewrite / résumé-theft vector (user_a, user_b, id,
--    created_at become non-writable by clients). The trigger below then pins
--    "each side moves only its own stage".
-- ---------------------------------------------------------------------------
revoke update on matches from authenticated, anon;
grant update (stage_a, stage_b, ended_at, ended_by) on matches to authenticated;

-- Enforce the documented lifecycle invariant (doc 08): a party may move only
-- their own kanban stage; either party may terminate (ended_at/ended_by).
-- Identity columns are already locked by the grant above; we re-assert them
-- here as defense-in-depth. Service-role / cron contexts (no Clerk JWT, so
-- ltb_uid() is null) bypass — ltb_decide_screen's revive-on-reaccept and
-- ltb_block_user run as authenticated parties and are allowed by the rules.
create or replace function ltb_matches_guard() returns trigger
  language plpgsql
  set search_path = public, extensions
  as $$
declare
  me text := ltb_uid();
begin
  if me is null then return new; end if;              -- service role / cron

  -- identity + provenance are immutable from the client
  if new.user_a is distinct from old.user_a
     or new.user_b is distinct from old.user_b
     or new.id is distinct from old.id
     or new.created_at is distinct from old.created_at then
    raise exception 'matches: identity columns are immutable' using errcode = 'check_violation';
  end if;

  -- you may only move your own side of the pipeline
  if me = old.user_a and new.stage_b is distinct from old.stage_b then
    raise exception 'matches: cannot move the counterparty''s stage' using errcode = 'check_violation';
  end if;
  if me = old.user_b and new.stage_a is distinct from old.stage_a then
    raise exception 'matches: cannot move the counterparty''s stage' using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists matches_guard on matches;
create trigger matches_guard before update on matches
  for each row execute function ltb_matches_guard();

-- ---------------------------------------------------------------------------
-- 3. messages — "Retract Statement" is the only client update. The existing
--    messages_retract policy (USING sender = me) also allowed a sender to
--    rewrite their own message `body` or relocate it to another match thread
--    after the fact — silent history tampering. Lock the record: once sent, only the
--    `retracted` flag may change.
-- ---------------------------------------------------------------------------
revoke update on messages from authenticated, anon;
grant update (retracted) on messages to authenticated;

create or replace function ltb_messages_guard() returns trigger
  language plpgsql
  set search_path = public, extensions
  as $$
declare
  me text := ltb_uid();
begin
  if me is null then return new; end if;              -- service role / cron
  if new.match_id is distinct from old.match_id
     or new.sender is distinct from old.sender
     or new.body is distinct from old.body
     or new.created_at is distinct from old.created_at then
    raise exception 'messages: only the retracted flag is mutable' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists messages_guard on messages;
create trigger messages_guard before update on messages
  for each row execute function ltb_messages_guard();

-- ---------------------------------------------------------------------------
-- 4. reference_letters — a reference is the *author's* statement, filed via the
--    token-gated submit-reference function. The owner curates visibility
--    (is_approved) and may delete, but must not be able to rewrite the author's
--    words and then display the edited version under that author's name. The
--    references_moderate policy (USING user_id = me, no column constraint)
--    allowed exactly that. Restrict the client's UPDATE to the approval flag;
--    author_name / relationship / body stay as filed. (INSERT is service-role
--    only; DELETE stays owner-allowed via its policy.)
-- ---------------------------------------------------------------------------
revoke update on reference_letters from authenticated, anon;
grant update (is_approved) on reference_letters to authenticated;

-- ---------------------------------------------------------------------------
-- 5. search_path hygiene — pin it on the two SECURITY DEFINER functions that
--    predate the convention (a definer function with a mutable search_path is
--    a classic privilege-escalation vector). Bodies are unchanged; only the
--    `set search_path` attribute is added.
-- ---------------------------------------------------------------------------
create or replace function ltb_is_matched(a text, b text) returns boolean
  language sql stable security definer
  set search_path = public, extensions
  as $$
    select exists (
      select 1 from matches m
      where m.ended_at is null
        and ((m.user_a = a and m.user_b = b) or (m.user_a = b and m.user_b = a))
    )
  $$;

create or replace function ltb_nightly() returns void
  language plpgsql security definer
  set search_path = public, extensions
  as $$
begin
  update profiles p set
    desirability = (
      (select count(*) from screens s
        where s.to_user = p.user_id
          and s.created_at > now() - interval '30 days') + 3
    )::real / (
      (select coalesce(sum(i.count), 0) from impressions i
        where i.viewed = p.user_id
          and i.last_seen_at > now() - interval '30 days') + 3 + 15
    )::real,
    completeness =
      0.40 * least((select count(*) from photos ph where ph.user_id = p.user_id), 4) / 4.0
    + 0.30 * least((select count(*) from behavioral_answers ba where ba.user_id = p.user_id), 3) / 3.0
    + 0.15 * (exists (select 1 from education ed where ed.user_id = p.user_id))::int
    + 0.15 * (exists (select 1 from experience ex where ex.user_id = p.user_id))::int
  where true;

  delete from rejects where created_at < now() - interval '30 days';
end;
$$;
