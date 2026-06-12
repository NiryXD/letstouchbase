-- waitlist — pre-launch signups with Employee Referral Bonus mechanics
-- (docs/plan/08-backend-contracts.md §8). Written by join-waitlist only.
--
-- Filename is timestamp-style rather than the next sequence number on
-- purpose: mobile phases are minting sequence-numbered migrations in
-- parallel, and this table depends on nothing — lexicographic ordering
-- applying it last is correct.

create table waitlist (
  id             uuid primary key default gen_random_uuid(),
  email          text not null check (char_length(email) <= 254),
  referral_code  text not null unique,
  referred_by    uuid references waitlist (id),
  referral_count int not null default 0,
  created_at     timestamptz not null default now()
);

-- idempotency key: one row per email, case-insensitive
create unique index waitlist_email_idx on waitlist (lower(email));
-- queue order: referrals first, then seniority — refer to move up
create index waitlist_rank_idx on waitlist (referral_count desc, created_at asc);

-- service-role only: RLS enabled with no policies, so the anon key can
-- neither read nor write the list.
alter table waitlist enable row level security;

-- atomic referral increment for join-waitlist (supabase-js can't express
-- `set x = x + 1`); locked away from the anon/authenticated roles.
create function ltb_count_referral(p_referrer uuid) returns void
  language sql
  set search_path = public
  as $$ update waitlist set referral_count = referral_count + 1 where id = p_referrer $$;
revoke execute on function ltb_count_referral(uuid) from public, anon, authenticated;

