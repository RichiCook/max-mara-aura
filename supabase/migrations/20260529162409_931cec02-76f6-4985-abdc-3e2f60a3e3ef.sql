
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS cutout_url text,
  ADD COLUMN IF NOT EXISTS cutout_status text,
  ADD COLUMN IF NOT EXISTS cutout_failed_reason text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('product-cutouts', 'product-cutouts', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Cutouts are publicly viewable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-cutouts');

CREATE POLICY "Service role manages cutouts"
  ON storage.objects FOR ALL
  USING (bucket_id = 'product-cutouts' AND auth.role() = 'service_role');
