-- Superadmin-only message deletion for POXY OS messenger

DROP POLICY IF EXISTS "staff_only_os_messages" ON public.os_messages;

CREATE POLICY "staff_read_os_messages" ON public.os_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_emails ae
      JOIN public.profiles p ON lower(p.email) = lower(ae.email)
      WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "staff_insert_os_messages" ON public.os_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_emails ae
      JOIN public.profiles p ON lower(p.email) = lower(ae.email)
      WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "superadmin_delete_os_messages" ON public.os_messages
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_emails ae
      JOIN public.profiles p ON lower(p.email) = lower(ae.email)
      WHERE p.id = auth.uid()
        AND ae.role IN ('superadmin', 'admin')
    )
  );

CREATE OR REPLACE FUNCTION public.delete_os_message(p_message_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_emails ae
    JOIN public.profiles p ON lower(p.email) = lower(ae.email)
    WHERE p.id = auth.uid()
      AND ae.role IN ('superadmin', 'admin')
  ) THEN
    RAISE EXCEPTION 'delete_os_message: superadmin only';
  END IF;

  DELETE FROM public.os_messages WHERE id = p_message_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_os_message(UUID) TO authenticated;
