-- Storage bucket for marketing creative assets (Session 8)
-- Path pattern: {user_id}/{filename}

INSERT INTO storage.buckets (id, name, public)
VALUES ('marketing-assets', 'marketing-assets', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS marketing_assets_read ON storage.objects;
CREATE POLICY marketing_assets_read ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'marketing-assets');

DROP POLICY IF EXISTS marketing_assets_upload ON storage.objects;
CREATE POLICY marketing_assets_upload ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'marketing-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
