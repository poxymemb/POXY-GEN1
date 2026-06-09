-- Storage upload path for POXY OS messenger image attachments
-- Path pattern: messenger/{user_id}/{filename}

DROP POLICY IF EXISTS support_attachments_upload_messenger ON storage.objects;
CREATE POLICY support_attachments_upload_messenger ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'support-attachments'
    AND (storage.foldername(name))[1] = 'messenger'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );
