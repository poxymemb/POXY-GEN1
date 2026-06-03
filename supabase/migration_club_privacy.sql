-- Club privacy & settings JSON (synced from Enclave Settings overlay)
alter table public.profiles
  add column if not exists club_privacy jsonb not null default '{}'::jsonb;

comment on column public.profiles.club_privacy is 'POXY Club: feed alias, passport visibility, shield level, notification prefs';
