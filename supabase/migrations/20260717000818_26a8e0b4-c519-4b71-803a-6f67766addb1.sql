UPDATE public.profiles p
SET is_premium = true,
    premium_plan = ps.plan,
    premium_expires_at = ps.premium_expires_at,
    updated_at = now()
FROM (
  SELECT DISTINCT ON (lower(email)) lower(email) AS email_l, plan, premium_expires_at
  FROM public.pending_supporters
  WHERE premium_expires_at > now()
  ORDER BY lower(email), premium_expires_at DESC
) ps
WHERE lower(p.email) = ps.email_l
  AND (p.is_premium IS NOT TRUE OR p.premium_expires_at IS DISTINCT FROM ps.premium_expires_at);