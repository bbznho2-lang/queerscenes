import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, MessageCircle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface SupportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ChatMessage {
  id: string;
  chat_id: string;
  sender_role: string;
  message: string;
  created_at: string;
}

const CHAT_ID_KEY = "support_chat_id";
const CHAT_TOKEN_KEY = "support_chat_token";

const SupportDialog = ({ open, onOpenChange }: SupportDialogProps) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [chatId, setChatId] = useState<string | null>(null);
  const [chatToken, setChatToken] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [starting, setStarting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      const savedId = localStorage.getItem(CHAT_ID_KEY);
      const savedToken = localStorage.getItem(CHAT_TOKEN_KEY);
      if (savedId && savedToken) {
        setChatId(savedId);
        setChatToken(savedToken);
      }
    }
  }, [open]);

  useEffect(() => {
    if (!chatId || !chatToken) return;
    const load = () => loadMessages(chatId, chatToken);
    load();
    const interval = setInterval(load, 1200);
    return () => clearInterval(interval);
  }, [chatId, chatToken]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const loadMessages = async (id: string, token: string) => {
    const { data, error } = await supabase.rpc("list_support_chat_messages" as any, { _chat_id: id, _token: token });
    if (!error && data) setMessages(data as ChatMessage[]);
  };

  const startChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error("Please fill in your name and email.");
      return;
    }
    setStarting(true);
    try {
      const { data, error } = await supabase.rpc("start_support_chat" as any, {
        _name: name.trim(),
        _email: email.trim(),
      });
      if (error || !data) {
        toast.error("Error starting chat.");
        return;
      }
      const result = data as { id: string; token: string };
      setChatId(result.id);
      setChatToken(result.token);
      localStorage.setItem(CHAT_ID_KEY, result.id);
      localStorage.setItem(CHAT_TOKEN_KEY, result.token);
      setMessages([]);
    } finally {
      setStarting(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !chatId || !chatToken) return;
    setSending(true);
    try {
      const { error } = await supabase.rpc("send_support_chat_message" as any, {
        _chat_id: chatId,
        _token: chatToken,
        _message: newMessage.trim(),
      });
      if (error) {
        toast.error("Error sending message.");
        return;
      }
      setNewMessage("");
      loadMessages(chatId, chatToken);
    } finally {
      setSending(false);
    }
  };

  const endChat = () => {
    setChatId(null);
    setChatToken(null);
    setMessages([]);
    setName("");
    setEmail("");
    localStorage.removeItem(CHAT_ID_KEY);
    localStorage.removeItem(CHAT_TOKEN_KEY);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="qs-modal max-w-md flex flex-col max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2 text-grad-brand">
            {chatId && (
              <button onClick={endChat} className="hover:bg-white/10 rounded-full p-1 transition-colors text-[var(--t1)]">
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            Live Support
          </DialogTitle>
        </DialogHeader>

        {!chatId ? (
          <form onSubmit={startChat} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-[var(--t2)] text-xs">Name</Label>
              <Input
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="qs-input"
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[var(--t2)] text-xs">Email</Label>
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="qs-input"
                maxLength={255}
              />
            </div>
            <Button type="submit" disabled={starting} className="qs-btn-primary w-full gap-2">
              <MessageCircle className="w-4 h-4" /> {starting ? "Starting..." : "Start Chat"}
            </Button>

            <div className="border-t border-white/5 pt-4 mt-2">
              <p className="text-xs text-[var(--t2)] text-center mb-3">For faster responses:</p>
              <a
                href="https://t.me/L7kznr"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-full border border-[rgba(139,43,226,.45)] text-[var(--brand-purple-light)] hover:bg-[rgba(139,43,226,.1)] transition-colors text-sm font-medium"
              >
                <MessageCircle className="w-4 h-4" /> Join Telegram
              </a>
            </div>
          </form>
        ) : (
          <div className="flex flex-col flex-1 min-h-0">
            <ScrollArea className="flex-1 pr-3 min-h-[250px] max-h-[400px]">
              <div ref={scrollRef} className="space-y-3 py-2">
                {messages.length === 0 && (
                  <p className="text-xs text-[var(--t2)] text-center py-8">
                    Send a message to start the conversation. We'll respond as soon as possible!
                  </p>
                )}
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.sender_role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                        msg.sender_role === "user"
                          ? "bg-grad-pb text-white rounded-br-md"
                          : "bg-[var(--s2)] text-[var(--t1)] rounded-bl-md"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                      <span className="text-[10px] opacity-60 mt-1 block">
                        {new Date(msg.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <form onSubmit={sendMessage} className="flex gap-2 pt-3 border-t border-white/5 mt-2">
              <Input
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="qs-input flex-1"
                maxLength={1000}
                autoFocus
              />
              <Button type="submit" size="icon" disabled={sending || !newMessage.trim()} className="qs-btn-primary rounded-full shrink-0">
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SupportDialog;
