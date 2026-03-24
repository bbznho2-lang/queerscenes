
-- Support chats table
CREATE TABLE public.support_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_name text NOT NULL,
  user_email text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.support_chats ENABLE ROW LEVEL SECURITY;

-- Anyone can create a chat
CREATE POLICY "Anyone can insert support chats"
ON public.support_chats FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- Users can view their own chats by email (since anonymous users don't have user_id)
CREATE POLICY "Anyone can view chats by email"
ON public.support_chats FOR SELECT TO anon, authenticated
USING (true);

-- Admins can update chats (close them)
CREATE POLICY "Admins can update support chats"
ON public.support_chats FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete chats
CREATE POLICY "Admins can delete support chats"
ON public.support_chats FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Chat messages table
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES public.support_chats(id) ON DELETE CASCADE,
  sender_role text NOT NULL DEFAULT 'user',
  message text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Anyone can insert messages
CREATE POLICY "Anyone can insert chat messages"
ON public.chat_messages FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- Anyone can view chat messages
CREATE POLICY "Anyone can view chat messages"
ON public.chat_messages FOR SELECT TO anon, authenticated
USING (true);

-- Admins can delete messages
CREATE POLICY "Admins can delete chat messages"
ON public.chat_messages FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for chat messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_chats;
