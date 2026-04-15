
-- Campaign sources table
CREATE TABLE public.campaign_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  label text NOT NULL,
  season text NOT NULL,
  description text,
  page_url text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.campaign_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view campaign sources" ON public.campaign_sources FOR SELECT USING (true);
CREATE POLICY "Admins can insert campaign sources" ON public.campaign_sources FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update campaign sources" ON public.campaign_sources FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete campaign sources" ON public.campaign_sources FOR DELETE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Service role can manage campaign_sources" ON public.campaign_sources FOR ALL USING (auth.role() = 'service_role');

CREATE TRIGGER update_campaign_sources_updated_at BEFORE UPDATE ON public.campaign_sources FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Campaign assets table
CREATE TABLE public.campaign_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid REFERENCES public.campaign_sources(id) ON DELETE CASCADE,
  original_url text NOT NULL,
  cached_url text,
  asset_type text NOT NULL,
  media_type text DEFAULT 'image',
  label text NOT NULL,
  enabled boolean DEFAULT false,
  render_mode text DEFAULT 'hotlink',
  last_health_check timestamptz,
  health_status text DEFAULT 'unknown',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.campaign_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view campaign assets" ON public.campaign_assets FOR SELECT USING (true);
CREATE POLICY "Admins can insert campaign assets" ON public.campaign_assets FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update campaign assets" ON public.campaign_assets FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete campaign assets" ON public.campaign_assets FOR DELETE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Service role can manage campaign_assets" ON public.campaign_assets FOR ALL USING (auth.role() = 'service_role');

CREATE TRIGGER update_campaign_assets_updated_at BEFORE UPDATE ON public.campaign_assets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_campaign_assets_source_id ON public.campaign_assets(source_id);
CREATE INDEX idx_campaign_assets_enabled ON public.campaign_assets(enabled);

-- Scrape logs table
CREATE TABLE public.scrape_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  status text DEFAULT 'running',
  assets_found integer DEFAULT 0,
  assets_new integer DEFAULT 0,
  assets_removed integer DEFAULT 0,
  error_message text
);

ALTER TABLE public.scrape_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view scrape logs" ON public.scrape_logs FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert scrape logs" ON public.scrape_logs FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Service role can manage scrape_logs" ON public.scrape_logs FOR ALL USING (auth.role() = 'service_role');

-- Storage bucket for cached campaign assets
INSERT INTO storage.buckets (id, name, public) VALUES ('campaign-assets', 'campaign-assets', true);

CREATE POLICY "Campaign assets are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'campaign-assets');
CREATE POLICY "Service role can upload campaign assets" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'campaign-assets' AND auth.role() = 'service_role');
CREATE POLICY "Service role can update campaign assets" ON storage.objects FOR UPDATE USING (bucket_id = 'campaign-assets' AND auth.role() = 'service_role');
CREATE POLICY "Service role can delete campaign assets" ON storage.objects FOR DELETE USING (bucket_id = 'campaign-assets' AND auth.role() = 'service_role');
