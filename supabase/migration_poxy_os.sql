-- ══════════════════════════════════════════════════════════════
-- Migration: poxy_os
-- POXY OS — messenger, tasks, updates, notes, marketing, system health
-- Apply via Supabase Dashboard → SQL Editor or supabase db push
-- ══════════════════════════════════════════════════════════════

-- ══════════════════════════════════════
-- UPDATES CENTER
-- ══════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.mcu_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL DEFAULT 'general',
  -- types: urgent / policy / mcu_update / game_update / general
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  requires_confirmation BOOLEAN NOT NULL DEFAULT FALSE,
  published_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.mcu_update_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  update_id UUID NOT NULL REFERENCES public.mcu_updates(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  confirmed_at TIMESTAMPTZ,
  CONSTRAINT mcu_update_reads_update_staff_key UNIQUE (update_id, staff_id)
);

CREATE INDEX IF NOT EXISTS idx_mcu_updates_type ON public.mcu_updates(type);
CREATE INDEX IF NOT EXISTS idx_mcu_updates_pinned ON public.mcu_updates(is_pinned);
CREATE INDEX IF NOT EXISTS idx_mcu_update_reads_staff ON public.mcu_update_reads(staff_id);

-- ══════════════════════════════════════
-- TASK MANAGER
-- ══════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.os_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'todo',
  department TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.os_task_subtasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.os_tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.os_task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.os_tasks(id) ON DELETE CASCADE,
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_os_tasks_assigned ON public.os_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_os_tasks_status ON public.os_tasks(status);
CREATE INDEX IF NOT EXISTS idx_os_task_subtasks_task ON public.os_task_subtasks(task_id);
CREATE INDEX IF NOT EXISTS idx_os_task_comments_task ON public.os_task_comments(task_id);

-- ══════════════════════════════════════
-- INTERNAL MESSENGER
-- ══════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.os_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL DEFAULT 'group',
  department TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.os_channel_members (
  channel_id UUID NOT NULL REFERENCES public.os_channels(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (channel_id, staff_id)
);

CREATE TABLE IF NOT EXISTS public.os_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES public.os_channels(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  body TEXT,
  attachment_url TEXT,
  attachment_type TEXT,
  attachment_ref UUID,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.os_message_reads (
  channel_id UUID NOT NULL REFERENCES public.os_channels(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (channel_id, staff_id)
);

CREATE INDEX IF NOT EXISTS idx_os_messages_channel ON public.os_messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_os_messages_created ON public.os_messages(created_at);

INSERT INTO public.os_channels (name, type, department) VALUES
  ('#general',   'group', NULL),
  ('#support',   'group', 'support'),
  ('#tech',      'group', 'tech'),
  ('#marketing', 'group', 'marketing'),
  ('#urgent',    'group', NULL)
ON CONFLICT (name) DO NOTHING;

-- ══════════════════════════════════════
-- NOTES
-- ══════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.os_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled',
  body TEXT NOT NULL DEFAULT '',
  tags TEXT[] NOT NULL DEFAULT '{}',
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_os_notes_staff ON public.os_notes(staff_id);

-- ══════════════════════════════════════
-- MARKETING
-- ══════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.mkt_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  platform TEXT[] NOT NULL DEFAULT '{}',
  start_date DATE,
  end_date DATE,
  goal TEXT,
  budget_pc INTEGER NOT NULL DEFAULT 0,
  result_notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.mkt_content_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT,
  platform TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  asset_url TEXT,
  campaign_id UUID REFERENCES public.mkt_campaigns(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.mkt_influencers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  platform TEXT NOT NULL,
  handle TEXT,
  followers_count INTEGER,
  niche TEXT,
  status TEXT NOT NULL DEFAULT 'prospect',
  notes TEXT,
  deal_terms TEXT,
  result_notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.mkt_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  url TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  version TEXT NOT NULL DEFAULT '1.0',
  approved BOOLEAN NOT NULL DEFAULT FALSE,
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ══════════════════════════════════════
-- SYSTEM HEALTH (cached)
-- ══════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.system_health_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  supabase_latency_ms INTEGER,
  edge_functions_status TEXT,
  storage_used_mb INTEGER,
  active_connections INTEGER,
  rpc_calls_today INTEGER,
  error_rate_1h NUMERIC(5, 4),
  notes TEXT
);

-- ══════════════════════════════════════
-- RLS — staff-only tables (admin_emails + profiles)
-- ══════════════════════════════════════

ALTER TABLE public.mcu_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcu_update_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.os_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.os_task_subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.os_task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.os_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.os_channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.os_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.os_message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.os_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mkt_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mkt_content_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mkt_influencers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mkt_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_health_log ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'mcu_updates', 'mcu_update_reads',
    'os_tasks', 'os_task_subtasks', 'os_task_comments',
    'os_channels', 'os_channel_members', 'os_messages', 'os_message_reads',
    'mkt_campaigns', 'mkt_content_calendar', 'mkt_influencers', 'mkt_assets',
    'system_health_log'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "staff_only_%s" ON public.%I', tbl, tbl);
    EXECUTE format(
      'CREATE POLICY "staff_only_%s" ON public.%I FOR ALL
       USING (
         EXISTS (
           SELECT 1 FROM public.admin_emails ae
           JOIN public.profiles p ON lower(p.email) = lower(ae.email)
           WHERE p.id = auth.uid()
         )
       )
       WITH CHECK (
         EXISTS (
           SELECT 1 FROM public.admin_emails ae
           JOIN public.profiles p ON lower(p.email) = lower(ae.email)
           WHERE p.id = auth.uid()
         )
       )',
      tbl, tbl
    );
  END LOOP;
END $$;

DROP POLICY IF EXISTS "staff_only_os_notes" ON public.os_notes;
DROP POLICY IF EXISTS "own_notes" ON public.os_notes;
CREATE POLICY "own_notes" ON public.os_notes
  FOR ALL
  USING (staff_id = auth.uid())
  WITH CHECK (staff_id = auth.uid());

-- ══════════════════════════════════════
-- REALTIME
-- ══════════════════════════════════════

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.os_messages;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.os_tasks;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.mcu_updates;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ══════════════════════════════════════
-- RPCs
-- ══════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_unread_counts()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'get_unread_counts: not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.admin_emails ae
    JOIN public.profiles p ON lower(p.email) = lower(ae.email)
    WHERE p.id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'get_unread_counts: staff only';
  END IF;

  SELECT jsonb_build_object(
    'updates', (
      SELECT COUNT(*)::int
      FROM public.mcu_updates u
      WHERE u.requires_confirmation = TRUE
        AND NOT EXISTS (
          SELECT 1
          FROM public.mcu_update_reads r
          WHERE r.update_id = u.id AND r.staff_id = auth.uid()
        )
    ),
    'tasks', (
      SELECT COUNT(*)::int
      FROM public.os_tasks
      WHERE assigned_to = auth.uid()
        AND status NOT IN ('done')
    ),
    'messages', (
      SELECT COALESCE(SUM(unread), 0)::int
      FROM (
        SELECT COUNT(*) AS unread
        FROM public.os_messages m
        JOIN public.os_channel_members cm
          ON cm.channel_id = m.channel_id
         AND cm.staff_id = auth.uid()
        LEFT JOIN public.os_message_reads mr
          ON mr.channel_id = m.channel_id
         AND mr.staff_id = auth.uid()
        WHERE m.sender_id IS DISTINCT FROM auth.uid()
          AND (mr.last_read_at IS NULL OR m.created_at > mr.last_read_at)
        GROUP BY m.channel_id
      ) x
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_update_read(p_update_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'confirm_update_read: not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.admin_emails ae
    JOIN public.profiles p ON lower(p.email) = lower(ae.email)
    WHERE p.id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'confirm_update_read: staff only';
  END IF;

  INSERT INTO public.mcu_update_reads (update_id, staff_id, read_at, confirmed, confirmed_at)
  VALUES (p_update_id, auth.uid(), NOW(), TRUE, NOW())
  ON CONFLICT (update_id, staff_id)
  DO UPDATE SET
    read_at = NOW(),
    confirmed = TRUE,
    confirmed_at = NOW();
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_dashboard()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_role TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'get_my_dashboard: not authenticated';
  END IF;

  SELECT ae.role INTO v_role
  FROM public.admin_emails ae
  JOIN public.profiles p ON lower(p.email) = lower(ae.email)
  WHERE p.id = auth.uid();

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'get_my_dashboard: staff only';
  END IF;

  SELECT jsonb_build_object(
    'role', v_role,
    'open_tickets', (
      SELECT COUNT(*)::int
      FROM public.support_tickets
      WHERE status IN ('open', 'in_progress')
        AND (assigned_to = auth.uid() OR assigned_to IS NULL)
    ),
    'sla_breach', (
      SELECT COUNT(*)::int
      FROM public.support_tickets t
      WHERE t.status IN ('open', 'in_progress')
        AND t.updated_at < NOW() - INTERVAL '4 hours'
    ),
    'my_tasks_today', (
      SELECT COUNT(*)::int
      FROM public.os_tasks
      WHERE assigned_to = auth.uid()
        AND status NOT IN ('done')
        AND (due_date <= CURRENT_DATE OR due_date IS NULL)
    ),
    'unread_messages', (
      SELECT COUNT(*)::int
      FROM public.os_messages m
      JOIN public.os_channel_members cm
        ON cm.channel_id = m.channel_id
       AND cm.staff_id = auth.uid()
      LEFT JOIN public.os_message_reads mr
        ON mr.channel_id = m.channel_id
       AND mr.staff_id = auth.uid()
      WHERE m.sender_id IS DISTINCT FROM auth.uid()
        AND (mr.last_read_at IS NULL OR m.created_at > mr.last_read_at)
    ),
    'urgent_updates', (
      SELECT COUNT(*)::int
      FROM public.mcu_updates u
      WHERE u.type = 'urgent'
        AND NOT EXISTS (
          SELECT 1
          FROM public.mcu_update_reads r
          WHERE r.update_id = u.id AND r.staff_id = auth.uid()
        )
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_unread_counts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_update_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_dashboard() TO authenticated;
