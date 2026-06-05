
-- Fix 1: repair_requests INSERT — enforce user_id is null or matches auth.uid()
DROP POLICY IF EXISTS "Anyone can insert repair requests" ON public.repair_requests;
CREATE POLICY "Anyone can insert repair requests"
  ON public.repair_requests
  FOR INSERT
  WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

-- Fix 2: repair-photos bucket — allow users to read their own photos
-- Photos are stored at paths like <repair_request_id>/<filename>
CREATE POLICY "Users can view their own repair photos"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'repair-photos'
    AND EXISTS (
      SELECT 1 FROM public.repair_requests rr
      WHERE rr.user_id = auth.uid()
        AND (
          (storage.foldername(name))[1] = rr.id::text
          OR name LIKE rr.id::text || '%'
        )
    )
  );

-- Fix 3: suppressed_emails — allow admins to view via client
CREATE POLICY "Admins can view suppressed emails"
  ON public.suppressed_emails
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
GRANT SELECT ON public.suppressed_emails TO authenticated;

-- Fix 4: SECURITY DEFINER functions — revoke PUBLIC execute, grant only to roles that need them
REVOKE EXECUTE ON FUNCTION public.clear_scan_events() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_integration_secret(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_email(text, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) TO service_role;
