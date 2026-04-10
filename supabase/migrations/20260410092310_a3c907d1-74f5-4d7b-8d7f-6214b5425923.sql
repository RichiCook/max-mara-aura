
-- ============================================================
-- LEADS: public INSERT, admin-only SELECT/UPDATE/DELETE
-- ============================================================
DROP POLICY IF EXISTS "Anyone can view leads" ON public.leads;
DROP POLICY IF EXISTS "Anyone can update leads" ON public.leads;
DROP POLICY IF EXISTS "Anyone can delete leads" ON public.leads;
DROP POLICY IF EXISTS "Anyone can insert leads" ON public.leads;

CREATE POLICY "Anyone can insert leads" ON public.leads FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view leads" ON public.leads FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update leads" ON public.leads FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete leads" ON public.leads FOR DELETE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Service role can manage leads" ON public.leads FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- API_LOGS: admin-only all operations
-- ============================================================
DROP POLICY IF EXISTS "Anyone can view api_logs" ON public.api_logs;
DROP POLICY IF EXISTS "Anyone can insert api_logs" ON public.api_logs;
DROP POLICY IF EXISTS "Anyone can delete api_logs" ON public.api_logs;

CREATE POLICY "Admins can view api_logs" ON public.api_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert api_logs" ON public.api_logs FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete api_logs" ON public.api_logs FOR DELETE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Service role can manage api_logs" ON public.api_logs FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- API_INTEGRATIONS: admin-only all operations
-- ============================================================
DROP POLICY IF EXISTS "Anyone can view api_integrations" ON public.api_integrations;
DROP POLICY IF EXISTS "Anyone can insert api_integrations" ON public.api_integrations;
DROP POLICY IF EXISTS "Anyone can update api_integrations" ON public.api_integrations;
DROP POLICY IF EXISTS "Anyone can delete api_integrations" ON public.api_integrations;

CREATE POLICY "Admins can view api_integrations" ON public.api_integrations FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert api_integrations" ON public.api_integrations FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update api_integrations" ON public.api_integrations FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete api_integrations" ON public.api_integrations FOR DELETE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Service role can manage api_integrations" ON public.api_integrations FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- PRODUCTS: public SELECT, admin-only write
-- ============================================================
DROP POLICY IF EXISTS "Anyone can insert products" ON public.products;
DROP POLICY IF EXISTS "Anyone can update products" ON public.products;
DROP POLICY IF EXISTS "Anyone can delete products" ON public.products;

CREATE POLICY "Admins can insert products" ON public.products FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update products" ON public.products FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete products" ON public.products FOR DELETE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Service role can manage products" ON public.products FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- ACTIVATIONS: public SELECT, admin-only write
-- ============================================================
DROP POLICY IF EXISTS "Anyone can insert activations" ON public.activations;
DROP POLICY IF EXISTS "Anyone can update activations" ON public.activations;
DROP POLICY IF EXISTS "Anyone can delete activations" ON public.activations;

CREATE POLICY "Admins can insert activations" ON public.activations FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update activations" ON public.activations FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete activations" ON public.activations FOR DELETE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Service role can manage activations" ON public.activations FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- PRODUCT_ACTIVATIONS: public SELECT, admin-only write
-- ============================================================
DROP POLICY IF EXISTS "Anyone can insert product_activations" ON public.product_activations;
DROP POLICY IF EXISTS "Anyone can update product_activations" ON public.product_activations;
DROP POLICY IF EXISTS "Anyone can delete product_activations" ON public.product_activations;

CREATE POLICY "Admins can insert product_activations" ON public.product_activations FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update product_activations" ON public.product_activations FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete product_activations" ON public.product_activations FOR DELETE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Service role can manage product_activations" ON public.product_activations FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- LOOKS: public SELECT, admin-only write
-- ============================================================
DROP POLICY IF EXISTS "Anyone can insert looks" ON public.looks;
DROP POLICY IF EXISTS "Anyone can update looks" ON public.looks;
DROP POLICY IF EXISTS "Anyone can delete looks" ON public.looks;

CREATE POLICY "Admins can insert looks" ON public.looks FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update looks" ON public.looks FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete looks" ON public.looks FOR DELETE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Service role can manage looks" ON public.looks FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- APP_SETTINGS: fix overly permissive write policies
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can insert settings" ON public.app_settings;
DROP POLICY IF EXISTS "Authenticated users can update settings" ON public.app_settings;

CREATE POLICY "Admins can insert settings" ON public.app_settings FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update settings" ON public.app_settings FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Service role can manage app_settings" ON public.app_settings FOR ALL USING (auth.role() = 'service_role');
