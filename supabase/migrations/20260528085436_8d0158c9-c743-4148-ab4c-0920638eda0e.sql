
CREATE TABLE public.product_image_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  product_code text,
  image_url text NOT NULL,
  source_order integer NOT NULL DEFAULT 0,
  machine_label text NOT NULL DEFAULT 'pending',
  machine_confidence numeric NOT NULL DEFAULT 0,
  suspicion_reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  review_status text NOT NULL DEFAULT 'pending',
  is_selected_lay_flat boolean NOT NULL DEFAULT false,
  manual_override boolean NOT NULL DEFAULT false,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, image_url)
);

CREATE INDEX idx_pic_product_id ON public.product_image_candidates(product_id);
CREATE INDEX idx_pic_review_status ON public.product_image_candidates(review_status);
CREATE INDEX idx_pic_machine_label ON public.product_image_candidates(machine_label);

GRANT SELECT ON public.product_image_candidates TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_image_candidates TO authenticated;
GRANT ALL ON public.product_image_candidates TO service_role;

ALTER TABLE public.product_image_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view image candidates"
  ON public.product_image_candidates FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert image candidates"
  ON public.product_image_candidates FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update image candidates"
  ON public.product_image_candidates FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete image candidates"
  ON public.product_image_candidates FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage image candidates"
  ON public.product_image_candidates FOR ALL
  USING (auth.role() = 'service_role'::text);

CREATE TRIGGER update_pic_updated_at
  BEFORE UPDATE ON public.product_image_candidates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS approved_lay_flat_image_url text,
  ADD COLUMN IF NOT EXISTS lay_flat_review_state text NOT NULL DEFAULT 'pending';

CREATE INDEX IF NOT EXISTS idx_products_lay_flat_review_state ON public.products(lay_flat_review_state);
