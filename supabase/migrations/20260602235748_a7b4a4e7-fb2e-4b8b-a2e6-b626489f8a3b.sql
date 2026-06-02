CREATE TABLE public.look_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  short_code text NOT NULL UNIQUE DEFAULT public.generate_short_code(),
  name text NOT NULL,
  description text,
  image_url text,
  product_codes text[] NOT NULL DEFAULT '{}',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX look_shares_short_code_idx ON public.look_shares(short_code);

GRANT SELECT ON public.look_shares TO anon;
GRANT SELECT, INSERT ON public.look_shares TO authenticated;
GRANT ALL ON public.look_shares TO service_role;

ALTER TABLE public.look_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Look shares are public readable"
  ON public.look_shares FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create look shares"
  ON public.look_shares FOR INSERT
  TO authenticated
  WITH CHECK (true);
