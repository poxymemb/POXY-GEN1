-- POXY CLUB v2: passport, awakening, session security (apply after migration_club_p0.sql)

alter table public.profiles
  add column if not exists club_passport_uid text,
  add column if not exists club_issued_at timestamptz,
  add column if not exists club_awakening_seen boolean not null default false,
  add column if not exists club_passport_skin text default 'classic',
  add column if not exists club_airgap_until timestamptz,
  add column if not exists club_qr_secret text;

create unique index if not exists profiles_club_passport_uid_unique
  on public.profiles (club_passport_uid)
  where club_passport_uid is not null;

comment on column public.profiles.club_passport_uid is 'PXY-XXX-LON transfer & London gate UID';
comment on column public.profiles.club_issued_at is 'First Founders Circle activation timestamp';
