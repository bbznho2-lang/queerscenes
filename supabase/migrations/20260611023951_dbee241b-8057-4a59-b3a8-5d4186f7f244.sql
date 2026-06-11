-- Allow senders to read their own sent direct messages
CREATE POLICY "Senders can view their sent messages"
  ON public.direct_messages
  FOR SELECT
  TO authenticated
  USING (sender_id = auth.uid());

-- Ensure REPLICA IDENTITY FULL so realtime row filtering works correctly with RLS
ALTER TABLE public.direct_messages REPLICA IDENTITY FULL;