-- Remove stale 1-arg open_standard_case_v3; keep (uuid, boolean) with DEFAULT FALSE
DROP FUNCTION IF EXISTS public.open_standard_case_v3(UUID);
