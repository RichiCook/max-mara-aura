
-- 1. Fix repair_requests: replace public SELECT with admin-only
DROP POLICY IF EXISTS "Anyone can view repair requests" ON public.repair_requests;
CREATE POLICY "Admins can view repair requests"
ON public.repair_requests FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Also allow service_role
CREATE POLICY "Service role can manage repair_requests"
ON public.repair_requests FOR ALL
USING (auth.role() = 'service_role'::text);

-- 2. Fix celebrity_content: restrict write ops to admin
DROP POLICY IF EXISTS "Authenticated users can insert celebrity content" ON public.celebrity_content;
DROP POLICY IF EXISTS "Authenticated users can update celebrity content" ON public.celebrity_content;
DROP POLICY IF EXISTS "Authenticated users can delete celebrity content" ON public.celebrity_content;

CREATE POLICY "Admins can insert celebrity content"
ON public.celebrity_content FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update celebrity content"
ON public.celebrity_content FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete celebrity content"
ON public.celebrity_content FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage celebrity_content"
ON public.celebrity_content FOR ALL
USING (auth.role() = 'service_role'::text);

-- 3. Fix look-images storage: restrict UPDATE/INSERT/DELETE to admins
DROP POLICY IF EXISTS "Anyone can upload look images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update look images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete look images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload look images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update look images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete look images" ON storage.objects;

CREATE POLICY "Admins can upload look images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'look-images' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update look images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'look-images' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete look images"
ON storage.objects FOR DELETE
USING (bucket_id = 'look-images' AND has_role(auth.uid(), 'admin'::app_role));
