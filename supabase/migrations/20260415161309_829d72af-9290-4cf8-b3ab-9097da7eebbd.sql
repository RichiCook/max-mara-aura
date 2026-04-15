
-- Update the auto_assign_admin_role function to include the new email
CREATE OR REPLACE FUNCTION public.auto_assign_admin_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.email IN ('riccardo.cook@customix.it', 'david.biagioni@customix.it', 'm.argenton@creactiveagency.com', 'davide.minganti@gmail.com', 'davide@galleriaobjets.com', 'davide@aitemz.com') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Grant admin to existing user if they already signed up
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'davide@aitemz.com'
ON CONFLICT (user_id, role) DO NOTHING;
