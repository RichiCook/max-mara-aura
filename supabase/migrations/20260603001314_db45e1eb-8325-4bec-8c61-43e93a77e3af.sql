GRANT SELECT ON public.look_shares TO anon;
GRANT SELECT, INSERT ON public.look_shares TO authenticated, anon;
GRANT ALL ON public.look_shares TO service_role;