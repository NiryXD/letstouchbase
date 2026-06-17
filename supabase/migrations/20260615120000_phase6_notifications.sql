-- ─── [Opus 4.8] Authored by Claude Opus 4.8 in this session (Phase 6) ───────
-- Notification preferences: per-category opt-outs + quiet hours, honored
-- server-side by the push-dispatch Edge Function (docs/plan/05 — "granular
-- per-category settings + quiet hours from day one"). A missing row means the
-- defaults below (everything on, no quiet hours), so existing users keep
-- getting pushes until they tune them.
--
-- Owner-only via RLS; the dispatcher reads it with the service role.
create table notification_prefs (
  user_id      text primary key references profiles on delete cascade,
  push_enabled boolean not null default true,   -- master switch
  screens      boolean not null default true,   -- "new inbound application"
  matches      boolean not null default true,   -- "offer extended"
  messages     boolean not null default true,   -- alignment call chat
  rejections   boolean not null default true,   -- formal rejection letter
  -- quiet hours in the user's local time; null disables them. Window may wrap
  -- midnight (e.g. 22 → 7). tz is the IANA name so the server can evaluate it.
  quiet_start  int check (quiet_start between 0 and 23),
  quiet_end    int check (quiet_end between 0 and 23),
  tz           text,
  updated_at   timestamptz not null default now()
);

alter table notification_prefs enable row level security;

create policy notif_prefs_owner on notification_prefs for all to authenticated
  using (user_id = ltb_uid()) with check (user_id = ltb_uid());
