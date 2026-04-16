
-- Extend product_carousels with new configuration columns
ALTER TABLE public.product_carousels ADD COLUMN IF NOT EXISTS display_position text NOT NULL DEFAULT 'below_product_info';
ALTER TABLE public.product_carousels ADD COLUMN IF NOT EXISTS show_on_categories text[] NOT NULL DEFAULT ARRAY['all'];
ALTER TABLE public.product_carousels ADD COLUMN IF NOT EXISTS min_products integer NOT NULL DEFAULT 3;
ALTER TABLE public.product_carousels ADD COLUMN IF NOT EXISTS sort_by text NOT NULL DEFAULT 'newest';
ALTER TABLE public.product_carousels ADD COLUMN IF NOT EXISTS exclude_current boolean NOT NULL DEFAULT true;

-- Extend products with recommendation attributes
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS silhouette_family text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS heel_height_mm integer;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS material text;

-- Product views tracking
CREATE TABLE public.product_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  session_id text NOT NULL,
  user_id uuid,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  view_duration_seconds integer
);

ALTER TABLE public.product_views ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_product_views_product_viewed ON public.product_views (product_id, viewed_at DESC);
CREATE INDEX idx_product_views_session ON public.product_views (session_id, viewed_at DESC);

CREATE POLICY "Anyone can insert product views" ON public.product_views FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view product views" ON public.product_views FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role can manage product_views" ON public.product_views FOR ALL USING (auth.role() = 'service_role'::text);

-- Recommendation clicks tracking
CREATE TABLE public.recommendation_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  target_product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  carousel_id uuid REFERENCES public.product_carousels(id) ON DELETE CASCADE NOT NULL,
  session_id text,
  clicked_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.recommendation_clicks ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_recommendation_clicks_carousel ON public.recommendation_clicks (carousel_id, clicked_at DESC);
CREATE INDEX idx_recommendation_clicks_source ON public.recommendation_clicks (source_product_id, clicked_at DESC);

CREATE POLICY "Anyone can insert recommendation clicks" ON public.recommendation_clicks FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view recommendation clicks" ON public.recommendation_clicks FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role can manage recommendation_clicks" ON public.recommendation_clicks FOR ALL USING (auth.role() = 'service_role'::text);
