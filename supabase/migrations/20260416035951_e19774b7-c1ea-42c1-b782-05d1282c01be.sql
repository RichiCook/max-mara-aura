
-- Remove FK constraint referencing dependence_rules
ALTER TABLE public.recommendation_clicks DROP CONSTRAINT IF EXISTS recommendation_clicks_rule_id_fkey;

-- Drop global dependence rules system
DROP TABLE IF EXISTS dependence_rule_audit_log;
DROP TABLE IF EXISTS dependence_rules;

-- Create per-carousel rules table
CREATE TABLE public.carousel_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  carousel_id uuid NOT NULL REFERENCES public.product_carousels(id) ON DELETE CASCADE,
  priority integer NOT NULL DEFAULT 10,
  is_active boolean DEFAULT true,
  trigger_categories text[] NOT NULL DEFAULT ARRAY['any'],
  trigger_filters jsonb DEFAULT '{}',
  target_category text NOT NULL,
  match_dimensions text[] NOT NULL DEFAULT ARRAY[]::text[],
  target_attribute_overrides jsonb DEFAULT '{}',
  max_results integer DEFAULT 8,
  sort_by text DEFAULT 'best_sellers',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_carousel_rules_carousel_priority ON public.carousel_rules (carousel_id, priority);

ALTER TABLE public.carousel_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage carousel_rules" ON public.carousel_rules FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view carousel_rules" ON public.carousel_rules FOR SELECT USING (true);
CREATE POLICY "Service role can manage carousel_rules" ON public.carousel_rules FOR ALL USING (auth.role() = 'service_role');

-- Update product_carousels: remove global rules columns, add fallback
ALTER TABLE public.product_carousels DROP COLUMN IF EXISTS use_dependence_rules;
ALTER TABLE public.product_carousels DROP COLUMN IF EXISTS linked_rule_ids;
ALTER TABLE public.product_carousels ADD COLUMN IF NOT EXISTS fallback_behavior text DEFAULT 'use_match_type';
ALTER TABLE public.product_carousels ADD COLUMN IF NOT EXISTS fallback_product_ids uuid[] DEFAULT ARRAY[]::uuid[];
