
-- Trigger-only functions: revoke from anon and authenticated (triggers run as table owner)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.auto_assign_admin_role() FROM anon, authenticated, public;

-- Admin-only RPCs: revoke from anon (internal admin check still enforces, but no need to expose)
REVOKE EXECUTE ON FUNCTION public.clear_scan_events() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_integration_secret(uuid) FROM anon, public;

-- has_role and generate_short_code must remain callable (used by RLS / column defaults).
