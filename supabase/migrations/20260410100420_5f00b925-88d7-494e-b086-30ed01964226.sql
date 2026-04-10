-- Fix repair-photos storage: restrict SELECT to admins only
DROP POLICY IF EXISTS "Anyone can view repair photos" ON storage.objects;

CREATE POLICY "Admins can view repair photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'repair-photos' AND has_role(auth.uid(), 'admin'::app_role));

-- Also allow service_role to access repair photos
CREATE POLICY "Service role can view repair photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'repair-photos' AND auth.role() = 'service_role'::text);