GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT INSERT ON public.leads TO anon;
GRANT ALL ON public.leads TO service_role;