-- ══════════════════════════════════════════════════════════════
-- Migration: support_tickets
-- Session A — POXY Support System (tickets, messages, FAQ, RPCs)
-- Apply via Supabase Dashboard → SQL Editor
-- Depends on: profiles, admin_emails (migration_admin_emails_table.sql)
-- Storage: create bucket `support-attachments` manually in Dashboard
-- ══════════════════════════════════════════════════════════════

-- ── 1. Tables ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject     TEXT        NOT NULL,
  status      TEXT        NOT NULL DEFAULT 'open'
                CHECK (status IN ('open', 'in_progress', 'closed')),
  assigned_to UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at   TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.ticket_messages (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id  UUID        NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id  UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_staff   BOOLEAN     NOT NULL DEFAULT FALSE,
  body       TEXT,
  image_url  TEXT,
  is_auto    BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.support_quick_replies (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title      TEXT        NOT NULL,
  body       TEXT        NOT NULL,
  created_by UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.support_faq (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  question   TEXT        NOT NULL,
  answer     TEXT        NOT NULL,
  category   TEXT        NOT NULL DEFAULT 'general',
  sort_order INTEGER     NOT NULL DEFAULT 0,
  is_active  BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.support_auto_messages (
  id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger   TEXT        NOT NULL UNIQUE,
  body      TEXT        NOT NULL,
  is_active BOOLEAN     NOT NULL DEFAULT TRUE
);


-- ── 2. Seed data (idempotent) ─────────────────────────────────

INSERT INTO public.support_auto_messages (trigger, body) VALUES
(
  'ticket_created',
  'Привет! 👋 Спасибо за обращение в POXY Support. Мы получили твой запрос и ответим в ближайшее время. Пока ты ждёшь — проверь наш FAQ, возможно там уже есть ответ на твой вопрос.'
),
(
  'ticket_closed',
  'Твой запрос был закрыт. Спасибо что обратился в POXY Support! Если вопрос не решён — открой новый тикет. Удачи в игре! 🎮'
)
ON CONFLICT (trigger) DO NOTHING;

INSERT INTO public.support_faq (question, answer, category, sort_order)
SELECT v.question, v.answer, v.category, v.sort_order
FROM (VALUES
  (
    'Как открыть лутбокс?',
    'Перейди во вкладку Hunt, выбери кейс и нажми OPEN BOX. Убедись что у тебя достаточно PC на балансе.',
    'gameplay', 1
  ),
  (
    'Что такое PC?',
    'PC (Poxy Coin) — внутриигровая валюта. Используется для открытия кейсов, покупок на маркете и других действий.',
    'economy', 2
  ),
  (
    'Как проверить честность дропа?',
    'После каждого открытия кейса появляется кнопка "Verify this drop". Нажми её чтобы увидеть криптографическое доказательство честности.',
    'crypto', 3
  ),
  (
    'Как продать POXY на маркете?',
    'Открой свою коллекцию, выбери актив и нажми "List for sale". Установи цену в PC.',
    'marketplace', 4
  ),
  (
    'Что такое Founder статус?',
    'Founder — особый статус для первых игроков POXY. Даёт постоянную скидку и эксклюзивный бейдж.',
    'account', 5
  )
) AS v(question, answer, category, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.support_faq LIMIT 1);

INSERT INTO public.support_quick_replies (title, body)
SELECT v.title, v.body
FROM (VALUES
  ('Проверь FAQ', 'Привет! Для решения этого вопроса рекомендуем сначала ознакомиться с нашим FAQ — там есть ответы на самые частые вопросы.'),
  ('Запрос обрабатывается', 'Мы получили твой запрос и уже разбираемся в ситуации. Пожалуйста, подожди немного — мы ответим как можно скорее.'),
  ('Нужна дополнительная информация', 'Чтобы помочь тебе, нам нужна дополнительная информация. Можешь уточнить детали или прикрепить скриншот?'),
  ('Проблема решена', 'Рады сообщить что твой вопрос решён! Если возникнут другие вопросы — обращайся, мы всегда рады помочь.'),
  ('Технические работы', 'В данный момент проводятся технические работы. Функционал будет восстановлен в ближайшее время. Приносим извинения за неудобства.')
) AS v(title, body)
WHERE NOT EXISTS (SELECT 1 FROM public.support_quick_replies LIMIT 1);


-- ── 3. Indexes ────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_tickets_user    ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status  ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_updated ON public.support_tickets(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_ticket ON public.ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.ticket_messages(created_at);


-- ── 4. Touch updated_at when a message is posted ────────────────

CREATE OR REPLACE FUNCTION public.support_tickets_touch_updated()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.support_tickets
  SET updated_at = NOW()
  WHERE id = NEW.ticket_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ticket_messages_touch_ticket ON public.ticket_messages;
CREATE TRIGGER ticket_messages_touch_ticket
  AFTER INSERT ON public.ticket_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.support_tickets_touch_updated();


-- ── 5. RLS ────────────────────────────────────────────────────

ALTER TABLE public.support_tickets        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_quick_replies  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_faq            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_auto_messages  ENABLE ROW LEVEL SECURITY;

-- Staff gate: admin_emails + profiles join (case-insensitive email)
-- NOTE: profiles.email must be synced from auth.users (see migration_support_rls_fix_v2.sql)

DROP POLICY IF EXISTS "user_own_tickets"   ON public.support_tickets;
DROP POLICY IF EXISTS "staff_all_tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "user_own_messages"   ON public.ticket_messages;
DROP POLICY IF EXISTS "staff_all_messages"  ON public.ticket_messages;
DROP POLICY IF EXISTS "faq_public_read"     ON public.support_faq;
DROP POLICY IF EXISTS "faq_staff_manage"    ON public.support_faq;
DROP POLICY IF EXISTS "quick_replies_staff" ON public.support_quick_replies;
DROP POLICY IF EXISTS "auto_messages_staff" ON public.support_auto_messages;

-- Players: own tickets
CREATE POLICY "user_own_tickets" ON public.support_tickets
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Staff: all tickets
CREATE POLICY "staff_all_tickets" ON public.support_tickets
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.admin_emails ae
      JOIN public.profiles p ON lower(p.email) = lower(ae.email)
      WHERE p.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.admin_emails ae
      JOIN public.profiles p ON lower(p.email) = lower(ae.email)
      WHERE p.id = auth.uid()
    )
  );

-- Players: messages on own tickets (non-staff, non-auto only)
CREATE POLICY "user_own_messages" ON public.ticket_messages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.support_tickets t
      WHERE t.id = ticket_id AND t.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.support_tickets t
      WHERE t.id = ticket_id AND t.user_id = auth.uid()
    )
    AND sender_id = auth.uid()
    AND is_staff = FALSE
    AND is_auto = FALSE
  );

-- Staff: all messages
CREATE POLICY "staff_all_messages" ON public.ticket_messages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.admin_emails ae
      JOIN public.profiles p ON lower(p.email) = lower(ae.email)
      WHERE p.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.admin_emails ae
      JOIN public.profiles p ON lower(p.email) = lower(ae.email)
      WHERE p.id = auth.uid()
    )
  );

-- FAQ: public read (active only)
CREATE POLICY "faq_public_read" ON public.support_faq
  FOR SELECT
  USING (is_active = TRUE);

-- FAQ: staff manage
CREATE POLICY "faq_staff_manage" ON public.support_faq
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.admin_emails ae
      JOIN public.profiles p ON lower(p.email) = lower(ae.email)
      WHERE p.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.admin_emails ae
      JOIN public.profiles p ON lower(p.email) = lower(ae.email)
      WHERE p.id = auth.uid()
    )
  );

-- Quick replies: staff only
CREATE POLICY "quick_replies_staff" ON public.support_quick_replies
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.admin_emails ae
      JOIN public.profiles p ON lower(p.email) = lower(ae.email)
      WHERE p.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.admin_emails ae
      JOIN public.profiles p ON lower(p.email) = lower(ae.email)
      WHERE p.id = auth.uid()
    )
  );

-- Auto messages config: staff only
CREATE POLICY "auto_messages_staff" ON public.support_auto_messages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.admin_emails ae
      JOIN public.profiles p ON lower(p.email) = lower(ae.email)
      WHERE p.id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.admin_emails ae
      JOIN public.profiles p ON lower(p.email) = lower(ae.email)
      WHERE p.id = auth.uid()
    )
  );


-- ── 6. Realtime ───────────────────────────────────────────────

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_messages;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;


-- ── 7. RPCs ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.create_support_ticket(
  p_subject       TEXT,
  p_first_message TEXT,
  p_image_url     TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket_id UUID;
  v_auto_msg  TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'create_support_ticket: not authenticated';
  END IF;

  IF coalesce(trim(p_subject), '') = '' THEN
    RAISE EXCEPTION 'create_support_ticket: subject required';
  END IF;

  IF coalesce(trim(p_first_message), '') = '' AND p_image_url IS NULL THEN
    RAISE EXCEPTION 'create_support_ticket: message or image required';
  END IF;

  INSERT INTO public.support_tickets (user_id, subject)
  VALUES (auth.uid(), trim(p_subject))
  RETURNING id INTO v_ticket_id;

  INSERT INTO public.ticket_messages (ticket_id, sender_id, is_staff, body, image_url)
  VALUES (v_ticket_id, auth.uid(), FALSE, nullif(trim(p_first_message), ''), p_image_url);

  SELECT body INTO v_auto_msg
  FROM public.support_auto_messages
  WHERE trigger = 'ticket_created' AND is_active = TRUE
  LIMIT 1;

  IF v_auto_msg IS NOT NULL THEN
    INSERT INTO public.ticket_messages (ticket_id, is_staff, body, is_auto)
    VALUES (v_ticket_id, TRUE, v_auto_msg, TRUE);
  END IF;

  RETURN v_ticket_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.close_support_ticket(p_ticket_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auto_msg TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'close_support_ticket: not authenticated';
  END IF;

  IF NOT public.private_is_staff_member() THEN
    RAISE EXCEPTION 'close_support_ticket: staff only';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.support_tickets WHERE id = p_ticket_id
  ) THEN
    RAISE EXCEPTION 'close_support_ticket: ticket not found';
  END IF;

  UPDATE public.support_tickets
  SET status = 'closed', closed_at = NOW(), updated_at = NOW()
  WHERE id = p_ticket_id;

  SELECT body INTO v_auto_msg
  FROM public.support_auto_messages
  WHERE trigger = 'ticket_closed' AND is_active = TRUE
  LIMIT 1;

  IF v_auto_msg IS NOT NULL THEN
    INSERT INTO public.ticket_messages (ticket_id, is_staff, body, is_auto)
    VALUES (p_ticket_id, TRUE, v_auto_msg, TRUE);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_support_ticket(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_support_ticket(UUID) TO authenticated;
