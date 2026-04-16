
-- Dependence rules table
CREATE TABLE public.dependence_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT false,
  priority integer NOT NULL DEFAULT 10,
  status text NOT NULL DEFAULT 'draft',
  trigger_categories text[] NOT NULL,
  trigger_filters jsonb NOT NULL DEFAULT '{}',
  target_category text NOT NULL,
  match_dimensions text[] NOT NULL DEFAULT ARRAY['color'],
  target_attribute_overrides jsonb NOT NULL DEFAULT '{}',
  max_results integer NOT NULL DEFAULT 8,
  sort_by text NOT NULL DEFAULT 'best_sellers',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  approved_by uuid,
  approved_at timestamptz
);

ALTER TABLE public.dependence_rules ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_dependence_rules_status ON public.dependence_rules (status, is_active);
CREATE INDEX idx_dependence_rules_trigger ON public.dependence_rules USING gin (trigger_categories);

CREATE POLICY "Admins can manage dependence_rules" ON public.dependence_rules FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role can manage dependence_rules" ON public.dependence_rules FOR ALL USING (auth.role() = 'service_role'::text);

-- Audit log
CREATE TABLE public.dependence_rule_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid REFERENCES public.dependence_rules(id) ON DELETE CASCADE NOT NULL,
  action text NOT NULL,
  performed_by uuid,
  performed_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  diff jsonb
);

ALTER TABLE public.dependence_rule_audit_log ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_audit_log_rule ON public.dependence_rule_audit_log (rule_id, performed_at DESC);

CREATE POLICY "Admins can view audit logs" ON public.dependence_rule_audit_log FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert audit logs" ON public.dependence_rule_audit_log FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service role can manage audit_log" ON public.dependence_rule_audit_log FOR ALL USING (auth.role() = 'service_role'::text);

-- Extend product_carousels
ALTER TABLE public.product_carousels ADD COLUMN IF NOT EXISTS target_category text NOT NULL DEFAULT 'same';
ALTER TABLE public.product_carousels ADD COLUMN IF NOT EXISTS target_attribute_overrides jsonb NOT NULL DEFAULT '{}';
ALTER TABLE public.product_carousels ADD COLUMN IF NOT EXISTS use_dependence_rules boolean NOT NULL DEFAULT false;
ALTER TABLE public.product_carousels ADD COLUMN IF NOT EXISTS linked_rule_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[];

-- Extend products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS price_tier text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS style_mood text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS occasion text[];
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS gender text NOT NULL DEFAULT 'women';

-- Extend recommendation_clicks
ALTER TABLE public.recommendation_clicks ADD COLUMN IF NOT EXISTS rule_id uuid REFERENCES public.dependence_rules(id) ON DELETE SET NULL;
ALTER TABLE public.recommendation_clicks ADD COLUMN IF NOT EXISTS match_reason text;
