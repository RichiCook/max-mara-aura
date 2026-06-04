CREATE TABLE public.user_saved_looks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  look_key text NOT NULL,
  name text,
  description text,
  image_url text,
  product_codes text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, look_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_saved_looks TO authenticated;
GRANT ALL ON public.user_saved_looks TO service_role;
ALTER TABLE public.user_saved_looks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own saved looks" ON public.user_saved_looks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);