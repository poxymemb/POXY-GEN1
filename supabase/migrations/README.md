# supabase/migrations

Two zones:

## `legacy/` — prototype-era migrations (frozen)

Everything that shaped the current production database
(project `rbrtjkfawdnomvvyxwvp`) up to the monorepo restructure. These files
were applied manually via the Supabase SQL Editor; their apply order is
defined by `legacy/MIGRATIONS.md`, **not** by filename sorting. Do not edit or
re-run them against production.

## This folder — CLI-managed migrations (go-forward)

From the beta build onward, every schema change is a new timestamped file
created with the Supabase CLI:

```
supabase migration new <name>     # creates YYYYMMDDHHMMSS_<name>.sql
```

Rules (non-negotiable):

- Schema changes happen ONLY through new migration files here. Never edit an
  old migration, never patch the database by hand.
- Every new table ships with RLS enabled and its policies in the same file.
- Client-side code never gets service-role access; writes that need it go
  through Edge Functions (`supabase/functions/`).
