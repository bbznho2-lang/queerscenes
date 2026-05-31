CREATE OR REPLACE FUNCTION public.protect_profile_premium_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Allow service_role (used by Stripe webhook) and admins to change premium fields.
  -- Block only regular authenticated users from self-promoting.
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    IF NEW.is_premium IS DISTINCT FROM OLD.is_premium
       OR NEW.premium_plan IS DISTINCT FROM OLD.premium_plan
       OR NEW.premium_expires_at IS DISTINCT FROM OLD.premium_expires_at THEN
      NEW.is_premium := OLD.is_premium;
      NEW.premium_plan := OLD.premium_plan;
      NEW.premium_expires_at := OLD.premium_expires_at;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;