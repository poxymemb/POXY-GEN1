-- Changelog (Session 11)
-- Internal release notes for tab-changelog

CREATE TABLE IF NOT EXISTS public.os_changelog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'feature',
  -- feature | bugfix | economy | urgent
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  affects_gameplay BOOLEAN NOT NULL DEFAULT FALSE,
  published_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_os_changelog_category ON public.os_changelog(category);
CREATE INDEX IF NOT EXISTS idx_os_changelog_created ON public.os_changelog(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_os_changelog_gameplay ON public.os_changelog(affects_gameplay);

ALTER TABLE public.os_changelog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_only_os_changelog" ON public.os_changelog;
CREATE POLICY "staff_only_os_changelog" ON public.os_changelog
  FOR ALL
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
  );
