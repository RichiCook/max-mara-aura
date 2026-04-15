
-- Product carousels definitions
CREATE TABLE public.product_carousels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  match_type text NOT NULL DEFAULT 'category',
  match_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  layout jsonb NOT NULL DEFAULT '{"card_size": "small", "columns": 4}'::jsonb,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.product_carousels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view product_carousels" ON public.product_carousels FOR SELECT USING (true);
CREATE POLICY "Admins can insert product_carousels" ON public.product_carousels FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update product_carousels" ON public.product_carousels FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete product_carousels" ON public.product_carousels FOR DELETE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Service role can manage product_carousels" ON public.product_carousels FOR ALL USING (auth.role() = 'service_role');

-- Manual curation / per-product overrides
CREATE TABLE public.product_carousel_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  carousel_id uuid NOT NULL REFERENCES public.product_carousels(id) ON DELETE CASCADE,
  source_product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  target_product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.product_carousel_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view product_carousel_items" ON public.product_carousel_items FOR SELECT USING (true);
CREATE POLICY "Admins can insert product_carousel_items" ON public.product_carousel_items FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update product_carousel_items" ON public.product_carousel_items FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete product_carousel_items" ON public.product_carousel_items FOR DELETE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Service role can manage product_carousel_items" ON public.product_carousel_items FOR ALL USING (auth.role() = 'service_role');

-- Updated_at trigger for carousels
CREATE TRIGGER update_product_carousels_updated_at
  BEFORE UPDATE ON public.product_carousels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed default carousel matching current Similar Products behavior
INSERT INTO public.product_carousels (name, match_type, match_config, layout, display_order, is_active)
VALUES ('Similar Products', 'category', '{"fallback_to_collection": true, "max_items": 12}'::jsonb, '{"card_size": "small", "columns": 4}'::jsonb, 0, true);
