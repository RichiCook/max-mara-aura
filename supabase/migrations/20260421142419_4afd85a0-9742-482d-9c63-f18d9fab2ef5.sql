-- Add nullable user_id to repair_requests for future ownership tracking
ALTER TABLE public.repair_requests
  ADD COLUMN IF NOT EXISTS user_id uuid;

CREATE INDEX IF NOT EXISTS idx_repair_requests_user_id
  ON public.repair_requests(user_id)
  WHERE user_id IS NOT NULL;

-- Allow submitters to view their own repair requests (when authenticated)
DROP POLICY IF EXISTS "Users can view own repair requests" ON public.repair_requests;
CREATE POLICY "Users can view own repair requests"
  ON public.repair_requests
  FOR SELECT
  TO authenticated
  USING (user_id IS NOT NULL AND auth.uid() = user_id);