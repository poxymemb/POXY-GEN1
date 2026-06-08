-- ══════════════════════════════════════════════════════════════
-- Migration: support_storage
-- Storage bucket for Support Panel photo attachments (Session B)
-- Apply via Supabase Dashboard → SQL Editor
-- Path pattern: tickets/{user_id}/{filename}
-- ══════════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public)
VALUES ('support-attachments', 'support-attachments', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS support_attachments_read ON storage.objects;
CREATE POLICY support_attachments_read ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'support-attachments');

DROP POLICY IF EXISTS support_attachments_upload_own ON storage.objects;
CREATE POLICY support_attachments_upload_own ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'support-attachments'
    AND (storage.foldername(name))[1] = 'tickets'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

DROP POLICY IF EXISTS support_attachments_update_own ON storage.objects;
CREATE POLICY support_attachments_update_own ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'support-attachments'
    AND (storage.foldername(name))[1] = 'tickets'
    AND (storage.foldername(name))[2] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'support-attachments'
    AND (storage.foldername(name))[1] = 'tickets'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );
