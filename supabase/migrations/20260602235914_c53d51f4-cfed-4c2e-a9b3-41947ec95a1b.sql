GRANT INSERT ON public.look_shares TO anon;

DROP POLICY IF EXISTS "Authenticated users can create look shares" ON public.look_shares;

CREATE POLICY "Anyone can create look shares"
  ON public.look_shares FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
