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

const SupportDialog = ({ open, onOpenChange }: SupportDialogProps) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [starting, setStarting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Try to restore existing chat from localStorage
  useEffect(() => {
    if (open) {
      const saved = localStorage.getItem("support_chat_id");
      if (saved) {
        setChatId(saved);
        loadMessages(saved);
      }
    }
  }, [open]);

  // Poll for new messages every 2.5s while chat is open
  useEffect(() => {
    if (!chatId) return;
    loadMessages(chatId);
    const interval = setInterval(() => loadMessages(chatId), 2500);
    return () => clearInterval(interval);
  }, [chatId]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadMessages = async (id: string) => {
    const { data, error } = await supabase.rpc("list_support_chat_messages" as any, { _chat_id: id });
    if (!error && data) {
      setMessages(data as ChatMessage[]);
    }
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
      const id = data as string;
      setChatId(id);
      localStorage.setItem("support_chat_id", id);
      setMessages([]);
    } finally {
      setStarting(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !chatId) return;
    setSending(true);
    try {
      const { error } = await supabase.rpc("send_support_chat_message" as any, {
        _chat_id: chatId,
        _message: newMessage.trim(),
      });
      if (error) {
        toast.error("Error sending message.");
        return;
      }
      setNewMessage("");
      loadMessages(chatId);
    } finally {
      setSending(false);
    }
  };

  const endChat = () => {
    setChatId(null);
    setMessages([]);
    setName("");
    setEmail("");
    localStorage.removeItem("support_chat_id");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-md flex flex-col max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="neon-text-blue text-xl flex items-center gap-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {chatId && (
              <button onClick={endChat} className="hover:bg-muted rounded-full p-1 transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            Live Support
          </DialogTitle>
        </DialogHeader>

        {!chatId ? (
          <form onSubmit={startChat} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs">Name</Label>
              <Input
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-muted/50 border-border"
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs">Email</Label>
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-muted/50 border-border"
                maxLength={255}
              />
            </div>
            <Button type="submit" disabled={starting} className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-full glow-blue gap-2">
              <MessageCircle className="w-4 h-4" /> {starting ? "Starting..." : "Start Chat"}
            </Button>

            <div className="border-t border-border pt-4 mt-2">
              <p className="text-xs text-muted-foreground text-center mb-3">For faster responses:</p>
              <a
                href="https://t.me/L7kznr"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-full neon-border-purple text-primary hover:bg-primary/10 transition-colors text-sm font-medium"
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
                  <p className="text-xs text-muted-foreground text-center py-8">
                    Send a message to start the conversation. We'll respond as soon as possible!
                  </p>
                )}
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender_role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                        msg.sender_role === "user"
                          ? "bg-secondary text-secondary-foreground rounded-br-md"
                          : "bg-muted text-foreground rounded-bl-md"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                      <span className="text-[10px] opacity-60 mt-1 block">
                        {new Date(msg.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <form onSubmit={sendMessage} className="flex gap-2 pt-3 border-t border-border mt-2">
              <Input
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="bg-muted/50 border-border flex-1"
                maxLength={1000}
                autoFocus
              />
              <Button type="submit" size="icon" disabled={sending || !newMessage.trim()} className="bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-full shrink-0">
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
