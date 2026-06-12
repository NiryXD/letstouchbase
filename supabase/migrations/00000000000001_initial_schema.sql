-- letstouchbase initial schema
-- Conventions: auth identity comes from Clerk via Supabase third-party auth,
-- so auth.jwt()->>'sub' is the Clerk user id (text, not uuid).

create extension if not exists postgis;
create extension if not exists pg_cron;

-- ---------------------------------------------------------------------------
-- helper: current clerk user id from the verified JWT
-- ---------------------------------------------------------------------------
create or replace function ltb_uid() returns text
  language sql stable
  as $$ select nullif(auth.jwt()->>'sub', '') $$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table profiles (
  user_id            text primary key,
  headline           text not null default '',
  executive_summary  text,
  current_title      text,
  employer           text,
  industry           text,
  archetype          text,
  open_to_work       text not null default 'committed'
                     check (open_to_work in ('committed','casual','networking')),
  birthdate          date not null,
  gender             text not null,
  height_cm          int,
  ethnicity          text,
  religion           text,
  family_plans       text,
  location           geography(point, 4326),
  is_business_trip   boolean not null default false,
  resume_pdf_path    text,
  out_of_office      boolean not null default false,
  is_paused          boolean not null default false,
  desirability       real not null default 0.5,   -- nightly ELO-lite recompute
  completeness       real not null default 0,
  last_active_at     timestamptz not null default now(),
  created_at         timestamptz not null default now()
);
create index profiles_location_idx on profiles using gist (location);
create index profiles_last_active_idx on profiles (last_active_at desc);

create table education (
  id           bigint generated always as identity primary key,
  user_id      text not null references profiles on delete cascade,
  school       text not null,
  degree_level text not null,
  field        text,
  class_year   int not null,
  position     int not null default 0
);
create index education_user_idx on education (user_id);

create table experience (
  id         bigint generated always as identity primary key,
  user_id    text not null references profiles on delete cascade,
  title      text not null,
  company    text,
  industry   text not null,
  start_year int not null,
  end_year   int,                                  -- null = Present
  one_liner  text check (char_length(one_liner) <= 100),
  position   int not null default 0
);
create index experience_user_idx on experience (user_id);

create table behavioral_answers (
  id       bigint generated always as identity primary key,
  user_id  text not null references profiles on delete cascade,
  question text not null,
  answer   text not null,
  position int not null default 0
);
create index behavioral_answers_user_idx on behavioral_answers (user_id);

create table photos (
  id           bigint generated always as identity primary key,
  user_id      text not null references profiles on delete cascade,
  slot         text not null,
  storage_path text not null,
  position     int not null default 0
);
create index photos_user_idx on photos (user_id);

create table preferences (
  user_id          text primary key references profiles on delete cascade,
  -- each vector: value columns + dealbreaker flag (Minimum Qualifications)
  age_min          int not null default 18,
  age_max          int not null default 99,
  age_db           boolean not null default false,
  max_distance_km  int not null default 50,
  genders          text[] not null default '{}',
  genders_db       boolean not null default true,
  height_min_cm    int,
  height_max_cm    int,
  height_db        boolean not null default false,
  ethnicities      text[],
  ethnicities_db   boolean not null default false,
  religions        text[],
  religions_db     boolean not null default false,
  family_plans     text[],
  family_plans_db  boolean not null default false,
  industries       text[],
  industries_db    boolean not null default false,
  min_degree_rank  int,
  degree_db        boolean not null default false,
  archetypes       text[],
  archetypes_db    boolean not null default false,
  open_to_work     text[],
  open_to_work_db  boolean not null default false
);

-- ---------------------------------------------------------------------------
-- social proof: endorsements & references (writable via shareable links)
-- ---------------------------------------------------------------------------
create table endorsements (
  id          bigint generated always as identity primary key,
  user_id     text not null references profiles on delete cascade,
  skill       text not null,
  endorser_id text,                 -- null when left via external link
  created_at  timestamptz not null default now(),
  unique (user_id, skill, endorser_id)
);

create table reference_letters (
  id            bigint generated always as identity primary key,
  user_id       text not null references profiles on delete cascade,
  author_name   text not null,
  relationship  text,
  body          text not null check (char_length(body) <= 600),
  is_approved   boolean not null default false,  -- owner approves before display
  created_at    timestamptz not null default now()
);

create table reference_invites (
  token      uuid primary key default gen_random_uuid(),
  user_id    text not null references profiles on delete cascade,
  expires_at timestamptz not null default now() + interval '14 days'
);

-- ---------------------------------------------------------------------------
-- the funnel: screens -> matches -> messages
-- ---------------------------------------------------------------------------
create table screens (
  id             bigint generated always as identity primary key,
  from_user      text not null references profiles on delete cascade,
  to_user        text not null references profiles on delete cascade,
  status         text not null default 'pending'
                 check (status in ('pending','accepted','rejected')),
  cover_letter   text check (char_length(cover_letter) <= 280),
  annotated_kind text,
  annotated_id   text,
  is_headhunt    boolean not null default false,
  created_at     timestamptz not null default now(),
  decided_at     timestamptz,
  unique (from_user, to_user)
);
create index screens_inbound_idx on screens (to_user, status, created_at desc);

-- rejects, for deck exclusion + 30-day recycle
create table rejects (
  from_user  text not null references profiles on delete cascade,
  to_user    text not null references profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (from_user, to_user)
);

create table matches (
  id          uuid primary key default gen_random_uuid(),
  user_a      text not null references profiles on delete cascade,
  user_b      text not null references profiles on delete cascade,
  -- per-side kanban stage (each user organizes their own pipeline)
  stage_a     text not null default 'offer_extended',
  stage_b     text not null default 'offer_extended',
  created_at  timestamptz not null default now(),
  ended_at    timestamptz,                          -- termination
  ended_by    text,
  check (user_a < user_b),
  unique (user_a, user_b)
);
create index matches_user_a_idx on matches (user_a) where ended_at is null;
create index matches_user_b_idx on matches (user_b) where ended_at is null;

create table messages (
  id         bigint generated always as identity primary key,
  match_id   uuid not null references matches on delete cascade,
  sender     text not null references profiles on delete cascade,
  body       text not null check (char_length(body) <= 2000),
  created_at timestamptz not null default now(),
  retracted  boolean not null default false        -- "Retract Statement"
);
create index messages_match_idx on messages (match_id, created_at);

create table rejection_letters (
  id         bigint generated always as identity primary key,
  from_user  text not null references profiles on delete cascade,
  to_user    text not null references profiles on delete cascade,
  body       text not null,
  context    text not null check (context in ('screen','match')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- trust & safety
-- ---------------------------------------------------------------------------
create table blocks (
  blocker    text not null references profiles on delete cascade,
  blocked    text not null references profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked)
);

create table reports (
  id          bigint generated always as identity primary key,
  reporter    text not null references profiles on delete cascade,
  reported    text not null references profiles on delete cascade,
  reason      text not null,                       -- includes 'dress_code'
  detail      text,
  status      text not null default 'open' check (status in ('open','reviewed','actioned')),
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- billing & devices
-- ---------------------------------------------------------------------------
create table entitlements (
  user_id          text primary key references profiles on delete cascade,
  is_executive     boolean not null default false, -- The Executive Suite
  headhunt_credits int not null default 0,
  boost_credits    int not null default 0,
  updated_at       timestamptz not null default now()
);

create table devices (
  user_id    text not null references profiles on delete cascade,
  push_token text not null,
  platform   text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, push_token)
);

-- daily screen counter (server-enforced 8/day for free users)
create table screen_counters (
  user_id text not null references profiles on delete cascade,
  day     date not null default current_date,
  count   int not null default 0,
  primary key (user_id, day)
);

-- ---------------------------------------------------------------------------
-- RLS: deny by default, owner-or-public-read patterns.
-- Mutating funnel actions (screens, matches, counters) go through Edge
-- Functions using the service role — clients never write those directly.
-- ---------------------------------------------------------------------------
alter table profiles enable row level security;
alter table education enable row level security;
alter table experience enable row level security;
alter table behavioral_answers enable row level security;
alter table photos enable row level security;
alter table preferences enable row level security;
alter table endorsements enable row level security;
alter table reference_letters enable row level security;
alter table reference_invites enable row level security;
alter table screens enable row level security;
alter table rejects enable row level security;
alter table matches enable row level security;
alter table messages enable row level security;
alter table rejection_letters enable row level security;
alter table blocks enable row level security;
alter table reports enable row level security;
alter table entitlements enable row level security;
alter table devices enable row level security;
alter table screen_counters enable row level security;

-- helper: are two users matched (active match)?
create or replace function ltb_is_matched(a text, b text) returns boolean
  language sql stable security definer
  as $$
    select exists (
      select 1 from matches m
      where m.ended_at is null
        and ((m.user_a = a and m.user_b = b) or (m.user_a = b and m.user_b = a))
    )
  $$;

-- profiles: everyone authenticated can read non-paused profiles (discovery);
-- owners manage their own row.
create policy profiles_read on profiles for select to authenticated
  using (is_paused = false or user_id = ltb_uid());
create policy profiles_insert on profiles for insert to authenticated
  with check (user_id = ltb_uid());
create policy profiles_update on profiles for update to authenticated
  using (user_id = ltb_uid());

-- profile sub-resources: public read, owner write
create policy education_read on education for select to authenticated using (true);
create policy education_write on education for all to authenticated
  using (user_id = ltb_uid()) with check (user_id = ltb_uid());
create policy experience_read on experience for select to authenticated using (true);
create policy experience_write on experience for all to authenticated
  using (user_id = ltb_uid()) with check (user_id = ltb_uid());
create policy behavioral_read on behavioral_answers for select to authenticated using (true);
create policy behavioral_write on behavioral_answers for all to authenticated
  using (user_id = ltb_uid()) with check (user_id = ltb_uid());
create policy photos_read on photos for select to authenticated using (true);
create policy photos_write on photos for all to authenticated
  using (user_id = ltb_uid()) with check (user_id = ltb_uid());

-- preferences: owner only (never visible to others)
create policy preferences_owner on preferences for all to authenticated
  using (user_id = ltb_uid()) with check (user_id = ltb_uid());

-- endorsements/references: public read (approved only), owner curates
create policy endorsements_read on endorsements for select to authenticated using (true);
create policy endorsements_delete on endorsements for delete to authenticated
  using (user_id = ltb_uid());
create policy references_read on reference_letters for select to authenticated
  using (is_approved = true or user_id = ltb_uid());
create policy references_moderate on reference_letters for update to authenticated
  using (user_id = ltb_uid());
create policy references_delete on reference_letters for delete to authenticated
  using (user_id = ltb_uid());
create policy ref_invites_owner on reference_invites for all to authenticated
  using (user_id = ltb_uid()) with check (user_id = ltb_uid());

-- screens: parties can read their own inbound/outbound; writes via Edge Function only
create policy screens_read on screens for select to authenticated
  using (from_user = ltb_uid() or to_user = ltb_uid());

create policy rejects_read on rejects for select to authenticated
  using (from_user = ltb_uid());

-- matches & messages: parties only
create policy matches_read on matches for select to authenticated
  using (user_a = ltb_uid() or user_b = ltb_uid());
create policy matches_stage on matches for update to authenticated
  using (user_a = ltb_uid() or user_b = ltb_uid());
create policy messages_read on messages for select to authenticated
  using (exists (select 1 from matches m where m.id = match_id
                 and (m.user_a = ltb_uid() or m.user_b = ltb_uid())));
create policy messages_send on messages for insert to authenticated
  with check (sender = ltb_uid()
    and exists (select 1 from matches m where m.id = match_id and m.ended_at is null
                and (m.user_a = ltb_uid() or m.user_b = ltb_uid())));
create policy messages_retract on messages for update to authenticated
  using (sender = ltb_uid());

create policy rejection_letters_read on rejection_letters for select to authenticated
  using (from_user = ltb_uid() or to_user = ltb_uid());
create policy rejection_letters_send on rejection_letters for insert to authenticated
  with check (from_user = ltb_uid());

-- blocks & reports: writer-owned
create policy blocks_owner on blocks for all to authenticated
  using (blocker = ltb_uid()) with check (blocker = ltb_uid());
create policy reports_insert on reports for insert to authenticated
  with check (reporter = ltb_uid());

-- entitlements: owner read; written by RevenueCat webhook (service role)
create policy entitlements_read on entitlements for select to authenticated
  using (user_id = ltb_uid());

-- devices: owner only
create policy devices_owner on devices for all to authenticated
  using (user_id = ltb_uid()) with check (user_id = ltb_uid());

-- counters: owner read; written by Edge Function (service role)
create policy counters_read on screen_counters for select to authenticated
  using (user_id = ltb_uid());

-- ---------------------------------------------------------------------------
-- storage buckets (photos public-read; resumes private, match-gated signed URLs)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('photos', 'photos', true);
insert into storage.buckets (id, name, public) values ('resumes', 'resumes', false);

create policy photos_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = ltb_uid());
create policy photos_owner_delete on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = ltb_uid());

create policy resumes_owner_all on storage.objects for all to authenticated
  using (bucket_id = 'resumes' and (storage.foldername(name))[1] = ltb_uid())
  with check (bucket_id = 'resumes' and (storage.foldername(name))[1] = ltb_uid());
-- matched users read each other's resume PDFs
create policy resumes_matched_read on storage.objects for select to authenticated
  using (bucket_id = 'resumes' and ltb_is_matched(ltb_uid(), (storage.foldername(name))[1]));
