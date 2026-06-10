-- M2 fix: allow premium case origins in user_poxy + case_open_events

ALTER TABLE public.user_poxy
  DROP CONSTRAINT IF EXISTS user_poxy_case_origin_check;

ALTER TABLE public.user_poxy
  ADD CONSTRAINT user_poxy_case_origin_check
  CHECK (case_origin = ANY (ARRAY[
    'standard', 'vip', 'genesis', 'mythic', 'legend', 'legacy', 'craft'
  ]::text[]));

ALTER TABLE public.case_open_events
  DROP CONSTRAINT IF EXISTS case_open_events_case_type_check;

ALTER TABLE public.case_open_events
  ADD CONSTRAINT case_open_events_case_type_check
  CHECK (case_type = ANY (ARRAY[
    'standard', 'vip', 'genesis', 'mythic', 'legend'
  ]::text[]));
