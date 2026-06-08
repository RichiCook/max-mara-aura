-- Create trigger to auto-assign admin role on user signup (idempotent: an earlier
-- migration already created this trigger; drop first so the clone applies cleanly)
DROP TRIGGER IF EXISTS on_auth_user_created_assign_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_assign_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_admin_role();