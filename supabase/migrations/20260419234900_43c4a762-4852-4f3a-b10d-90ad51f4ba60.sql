
-- =============================================================================
-- 1. STORAGE: repair-photos goes PRIVATE
-- =============================================================================
UPDATE storage.buckets
SET public = false,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
WHERE id = 'repair-photos';

-- Drop any existing public-read policies on repair-photos
DROP POLICY IF EXISTS "Public can view repair photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view repair photos" ON storage.objects;
DROP POLICY IF EXISTS "Public read repair photos" ON storage.objects;
DROP POLICY IF EXISTS "Repair photos are publicly accessible" ON storage.objects;

-- Drop any existing insert policies we'll replace
DROP POLICY IF EXISTS "Anyone can upload repair photos" ON storage.objects;
DROP POLICY IF EXISTS "Public can upload repair photos" ON storage.objects;
DROP POLICY IF EXISTS "Anon can upload repair photos" ON storage.objects;

-- Allow anonymous uploads (consumer flow from QR scan, no auth)
CREATE POLICY "Anyone can upload repair photos"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'repair-photos');

-- Admins can view repair photos
DROP POLICY IF EXISTS "Admins can view repair photos" ON storage.objects;
CREATE POLICY "Admins can view repair photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'repair-photos' AND has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete repair photos
DROP POLICY IF EXISTS "Admins can delete repair photos" ON storage.objects;
CREATE POLICY "Admins can delete repair photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'repair-photos' AND has_role(auth.uid(), 'admin'::app_role));

-- =============================================================================
-- 2. STORAGE: look-images — drop anonymous upload
-- =============================================================================
DROP POLICY IF EXISTS "Anon can upload look images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload look images" ON storage.objects;
DROP POLICY IF EXISTS "Public can upload look images" ON storage.objects;

-- Admins can manage look images (backend uses service role automatically)
DROP POLICY IF EXISTS "Admins can upload look images" ON storage.objects;
CREATE POLICY "Admins can upload look images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'look-images' AND has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can delete look images" ON storage.objects;
CREATE POLICY "Admins can delete look images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'look-images' AND has_role(auth.uid(), 'admin'::app_role));

-- =============================================================================
-- 3. LENGTH CONSTRAINTS — leads
-- =============================================================================
ALTER TABLE public.leads
  DROP CONSTRAINT IF EXISTS leads_email_length,
  DROP CONSTRAINT IF EXISTS leads_name_length,
  DROP CONSTRAINT IF EXISTS leads_phone_length,
  DROP CONSTRAINT IF EXISTS leads_reward_code_length;

ALTER TABLE public.leads
  ADD CONSTRAINT leads_email_length CHECK (char_length(email) <= 255),
  ADD CONSTRAINT leads_name_length CHECK (name IS NULL OR char_length(name) <= 100),
  ADD CONSTRAINT leads_phone_length CHECK (phone IS NULL OR char_length(phone) <= 32),
  ADD CONSTRAINT leads_reward_code_length CHECK (reward_code IS NULL OR char_length(reward_code) <= 64);

-- =============================================================================
-- 4. LENGTH CONSTRAINTS — repair_requests
-- =============================================================================
ALTER TABLE public.repair_requests
  DROP CONSTRAINT IF EXISTS repair_requests_user_name_length,
  DROP CONSTRAINT IF EXISTS repair_requests_user_email_length,
  DROP CONSTRAINT IF EXISTS repair_requests_city_length,
  DROP CONSTRAINT IF EXISTS repair_requests_country_length,
  DROP CONSTRAINT IF EXISTS repair_requests_damage_type_length;

ALTER TABLE public.repair_requests
  ADD CONSTRAINT repair_requests_user_name_length CHECK (user_name IS NULL OR char_length(user_name) <= 100),
  ADD CONSTRAINT repair_requests_user_email_length CHECK (user_email IS NULL OR char_length(user_email) <= 255),
  ADD CONSTRAINT repair_requests_city_length CHECK (city IS NULL OR char_length(city) <= 100),
  ADD CONSTRAINT repair_requests_country_length CHECK (country IS NULL OR char_length(country) <= 100),
  ADD CONSTRAINT repair_requests_damage_type_length CHECK (char_length(damage_type) <= 50);

-- =============================================================================
-- 5. LENGTH CONSTRAINTS — analytics tables
-- =============================================================================
ALTER TABLE public.scan_events
  DROP CONSTRAINT IF EXISTS scan_events_session_id_length,
  DROP CONSTRAINT IF EXISTS scan_events_product_code_length,
  DROP CONSTRAINT IF EXISTS scan_events_event_type_length;

ALTER TABLE public.scan_events
  ADD CONSTRAINT scan_events_session_id_length CHECK (char_length(session_id) <= 128),
  ADD CONSTRAINT scan_events_product_code_length CHECK (char_length(product_code) <= 64),
  ADD CONSTRAINT scan_events_event_type_length CHECK (char_length(event_type) <= 64);

ALTER TABLE public.product_views
  DROP CONSTRAINT IF EXISTS product_views_session_id_length;

ALTER TABLE public.product_views
  ADD CONSTRAINT product_views_session_id_length CHECK (char_length(session_id) <= 128);

ALTER TABLE public.recommendation_clicks
  DROP CONSTRAINT IF EXISTS recommendation_clicks_session_id_length,
  DROP CONSTRAINT IF EXISTS recommendation_clicks_match_reason_length;

ALTER TABLE public.recommendation_clicks
  ADD CONSTRAINT recommendation_clicks_session_id_length CHECK (session_id IS NULL OR char_length(session_id) <= 128),
  ADD CONSTRAINT recommendation_clicks_match_reason_length CHECK (match_reason IS NULL OR char_length(match_reason) <= 64);

-- =============================================================================
-- 6. API integrations — restrict api_key column
-- =============================================================================
REVOKE SELECT (api_key) ON public.api_integrations FROM anon, authenticated;

-- Helper: admins can fetch a single integration's secret on demand
CREATE OR REPLACE FUNCTION public.get_integration_secret(_integration_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _secret text;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  SELECT api_key INTO _secret
  FROM public.api_integrations
  WHERE id = _integration_id;

  RETURN _secret;
END;
$$;

REVOKE ALL ON FUNCTION public.get_integration_secret(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_integration_secret(uuid) TO authenticated;
