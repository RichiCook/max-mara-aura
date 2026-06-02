
-- Wishlist & Wardrobe tables
CREATE TABLE public.user_wishlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_wishlist TO authenticated;
GRANT ALL ON public.user_wishlist TO service_role;

ALTER TABLE public.user_wishlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own wishlist" ON public.user_wishlist
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can add to their own wishlist" ON public.user_wishlist
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove from their own wishlist" ON public.user_wishlist
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_user_wishlist_user ON public.user_wishlist(user_id);

CREATE TABLE public.user_wardrobe (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid NOT NULL,
  note text,
  acquired_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_wardrobe TO authenticated;
GRANT ALL ON public.user_wardrobe TO service_role;

ALTER TABLE public.user_wardrobe ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own wardrobe" ON public.user_wardrobe
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can add to their own wardrobe" ON public.user_wardrobe
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own wardrobe" ON public.user_wardrobe
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can remove from their own wardrobe" ON public.user_wardrobe
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_user_wardrobe_user ON public.user_wardrobe(user_id);

-- Link leads to auth users
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS user_id uuid;
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON public.leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_email_lower ON public.leads(lower(email));

-- Extend handle_new_user to also create/link a lead
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email)
  ON CONFLICT (id) DO NOTHING;

  -- Link an existing lead with this email, else create a new one
  UPDATE public.leads
     SET user_id = new.id
   WHERE user_id IS NULL
     AND lower(email) = lower(new.email);

  IF NOT FOUND THEN
    INSERT INTO public.leads (email, user_id, reward_type)
    VALUES (new.email, new.id, 'account_signup');
  END IF;

  RETURN new;
END;
$function$;
