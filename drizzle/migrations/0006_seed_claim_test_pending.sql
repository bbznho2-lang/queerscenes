INSERT INTO public.pending_supporters (email, plan, premium_expires_at, status)
SELECT 'claim-test-1793417174@example.com', 'monthly', now() + interval '30 days', 'paid';