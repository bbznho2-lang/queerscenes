import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Mail, Send, Paperclip, X, ExternalLink, Search, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { linkify } from "@/lib/linkify";

const TELEGRAM_REPLY_URL = "https://t.me/L7kznr";

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string | null;
  body: string;
  media_url: string | null;
  media_type: string | null;
  media_name: string | null;
  created_at: string;
}

interface ProfileLite {
  user_id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  is_premium?: boolean | null;
}

interface Props {
  userId: string;
  isAdmin: boolean;
}

const profileLabel = (p: ProfileLite) => {
  const name = `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim();
  return name || p.email || "User";
};

const MessagesPopover = ({ userId, isAdmin }: Props) => {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"inbox" | "compose">("inbox");
  const [messages, setMessages] = useState<Message[]>([]);
  const [unread, setUnread] = useState(0);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({});

  // Compose state (admin)
  const [recipientId, setRecipientId] = useState<string | "all">("all");
  const [profiles, setProfiles] = useState<ProfileLite[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchUnread = useCallback(async () => {
    const { data } = await supabase.rpc("count_unread_direct_messages" as any);
    setUnread(typeof data === "number" ? data : 0);
  }, []);

  const fetchMessages = useCallback(async () => {
    const { data } = await (supabase as any)
      .from("direct_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    let list = (data as Message[]) || [];

    const ids = list.map((m) => m.id);
    // Filter out messages the current user has hidden
    if (ids.length) {
      const { data: hides } = await (supabase as any)
        .from("direct_message_hides")
        .select("message_id")
        .in("message_id", ids)
        .eq("user_id", userId);
      const hiddenSet = new Set(((hides as any[]) || []).map((h) => h.message_id));
      list = list.filter((m) => !hiddenSet.has(m.id));
    }
    setMessages(list);

    // Load reads to know which are unread
    const visibleIds = list.map((m) => m.id);
    if (visibleIds.length) {
      const { data: reads } = await (supabase as any)
        .from("direct_message_reads")
        .select("message_id")
        .in("message_id", visibleIds)
        .eq("user_id", userId);
      setReadIds(new Set(((reads as any[]) || []).map((r) => r.message_id)));
    } else {
      setReadIds(new Set());
    }


    // Sign URLs
    const toSign = list.filter((m) => m.media_url);
    if (toSign.length) {
      const entries = await Promise.all(
        toSign.map(async (m) => {
          const { data: signed } = await supabase.storage
            .from("dm-media")
            .createSignedUrl(m.media_url!, 60 * 60);
          return [m.id, signed?.signedUrl || ""] as const;
        }),
      );
      setMediaUrls(Object.fromEntries(entries));
    }
  }, [userId]);

  const fetchProfiles = useCallback(async () => {
    if (!isAdmin) return;
    const { data } = await supabase
      .from("profiles")
      .select("user_id,email,first_name,last_name,is_premium")
      .order("created_at", { ascending: false })
      .limit(2000);
    setProfiles((data as ProfileLite[]) || []);
  }, [isAdmin]);

  useEffect(() => {
    void fetchUnread();
    const channel = supabase
      .channel("direct-messages-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "direct_messages" },
        () => {
          void fetchUnread();
          if (open) void fetchMessages();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchUnread, fetchMessages, open]);

  useEffect(() => {
    if (open) {
      void fetchMessages();
      void fetchProfiles();
    }
  }, [open, fetchMessages, fetchProfiles]);

  const markAllRead = async () => {
    const unreadMsgs = messages.filter((m) => !readIds.has(m.id));
    if (!unreadMsgs.length) return;
    const rows = unreadMsgs.map((m) => ({ message_id: m.id, user_id: userId }));
    const { error } = await (supabase as any)
      .from("direct_message_reads")
      .upsert(rows, { onConflict: "message_id,user_id", ignoreDuplicates: true });
    if (!error) {
      setReadIds(new Set([...readIds, ...unreadMsgs.map((m) => m.id)]));
      void fetchUnread();
    }
  };

  // Auto-mark read shortly after opening inbox
  useEffect(() => {
    if (open && tab === "inbox" && messages.length) {
      const t = setTimeout(() => void markAllRead(), 800);
      return () => clearTimeout(t);
    }
  }, [open, tab, messages]);

  const filteredProfiles = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return profiles.slice(0, 50);
    return profiles
      .filter((p) =>
        [p.email, p.first_name, p.last_name]
          .filter(Boolean)
          .some((s) => s!.toLowerCase().includes(q)),
      )
      .slice(0, 50);
  }, [profiles, userSearch]);

  const handleSend = async () => {
    if (!body.trim() && !file) {
      toast.error("Type a message or attach a file");
      return;
    }
    setSending(true);
    try {
      let media_url: string | null = null;
      let media_type: string | null = null;
      let media_name: string | null = null;
      if (file) {
        const ext = file.name.split(".").pop() || "bin";
        const path = `${recipientId === "all" ? "broadcast" : recipientId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("dm-media").upload(path, file, {
          contentType: file.type || undefined,
          upsert: false,
        });
        if (upErr) throw upErr;
        media_url = path;
        media_type = file.type || "application/octet-stream";
        media_name = file.name;
      }
      if (recipientId === "all") {
        const supporterIds = profiles.map((p) => p.user_id);
        if (!supporterIds.length) throw new Error("No supporters to send to");
        const rows = supporterIds.map((rid) => ({
          sender_id: userId,
          recipient_id: rid,
          body: body.trim(),
          media_url,
          media_type,
          media_name,
        }));
        const { error } = await (supabase as any).from("direct_messages").insert(rows);
        if (error) throw error;
        toast.success(`Sent to ${supporterIds.length} supporters`);
      } else {
        const { error } = await (supabase as any).from("direct_messages").insert({
          sender_id: userId,
          recipient_id: recipientId,
          body: body.trim(),
          media_url,
          media_type,
          media_name,
        });
        if (error) throw error;
        toast.success("Message sent");
      }
      setBody("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      setTab("inbox");
      void fetchMessages();
    } catch (e: any) {
      toast.error(e.message || "Failed to send");
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (isAdmin) {
      const { error } = await (supabase as any).from("direct_messages").delete().eq("id", id);
      if (error) {
        toast.error("Failed to delete");
        return;
      }
    } else {
      // Regular users hide the message permanently from their own inbox
      const { error } = await (supabase as any)
        .from("direct_message_hides")
        .upsert({ message_id: id, user_id: userId }, { onConflict: "message_id,user_id", ignoreDuplicates: true });
      if (error) {
        toast.error("Failed to remove");
        return;
      }
    }
    setMessages((prev) => prev.filter((m) => m.id !== id));
    void fetchUnread();
  };


  const renderMedia = (msg: Message) => {
    const url = mediaUrls[msg.id];
    if (!msg.media_url || !url) return null;
    const type = msg.media_type || "";
    if (type.startsWith("image/")) {
      return (
        <a href={url} target="_blank" rel="noopener noreferrer" className="block mt-2">
          <img src={url} alt={msg.media_name || "attachment"} className="max-h-48 rounded-md border border-border" />
        </a>
      );
    }
    if (type.startsWith("video/")) {
      return (
        <video controls src={url} className="max-h-48 mt-2 rounded-md border border-border w-full" />
      );
    }
    if (type.startsWith("audio/")) {
      return <audio controls src={url} className="mt-2 w-full" />;
    }
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
      >
        <Paperclip className="w-3.5 h-3.5" />
        {msg.media_name || "Download attachment"}
        <ExternalLink className="w-3 h-3" />
      </a>
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-primary/20 transition-colors"
          title="Messages"
          aria-label="Messages"
        >
          <Mail className="w-5 h-5 text-primary" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center border border-background">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[22rem] p-0 bg-card border-border overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setTab("inbox")}
            className={`flex-1 text-xs font-medium py-2 transition-colors ${
              tab === "inbox" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Inbox {unread > 0 && <span className="ml-1 text-[10px] opacity-80">({unread})</span>}
          </button>
          {isAdmin && (
            <button
              onClick={() => setTab("compose")}
              className={`flex-1 text-xs font-medium py-2 transition-colors ${
                tab === "compose" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Compose
            </button>
          )}
        </div>

        {tab === "inbox" && (
          <div className="max-h-[60vh] overflow-y-auto">
            {messages.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8 px-4">No messages yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {messages.map((msg) => {
                  const isUnread = !readIds.has(msg.id);
                  const isBroadcast = msg.recipient_id === null;
                  return (
                    <li key={msg.id} className={`p-3 ${isUnread ? "bg-primary/5" : ""}`}>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                          {isUnread && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                          <span>
                            {isBroadcast ? "Broadcast" : "Direct"} •{" "}
                            {new Date(msg.created_at).toLocaleString(undefined, {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDelete(msg.id)}
                          className="text-muted-foreground hover:text-destructive"
                          title={isAdmin ? "Delete" : "Remove from inbox"}
                          aria-label={isAdmin ? "Delete" : "Remove from inbox"}
                        >
                          {isAdmin ? <Trash2 className="w-3 h-3" /> : <X className="w-3.5 h-3.5" />}
                        </button>

                      </div>
                      {msg.body && (
                        <p className="text-xs text-foreground whitespace-pre-wrap break-words">
                          {linkify(msg.body)}
                        </p>
                      )}
                      {renderMedia(msg)}
                      {!isAdmin && (
                        <a
                          href={TELEGRAM_REPLY_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-primary hover:underline"
                        >
                          <Send className="w-3 h-3" />
                          Reply on Telegram
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {tab === "compose" && isAdmin && (
          <div className="p-3 space-y-2">
            <div>
              <p className="text-[11px] font-medium text-foreground mb-1">To</p>
              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={() => setRecipientId("all")}
                  className={`px-2 py-1 rounded text-[11px] border transition-colors ${
                    recipientId === "all"
                      ? "bg-primary/20 border-primary text-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Supporters
                </button>
                {recipientId !== "all" && (
                  <span className="text-[11px] text-foreground truncate">
                    {profiles.find((p) => p.user_id === recipientId)
                      ? profileLabel(profiles.find((p) => p.user_id === recipientId)!)
                      : "Select user"}
                  </span>
                )}
              </div>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search supporter by email or name..."
                  className="pl-7 h-8 text-xs bg-muted/50 border-border"
                />
              </div>
              <div className="max-h-32 overflow-y-auto mt-1 border border-border rounded">
                {filteredProfiles.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground p-2 text-center">No users</p>
                ) : (
                  filteredProfiles.map((p) => (
                    <button
                      key={p.user_id}
                      onClick={() => setRecipientId(p.user_id)}
                      className={`w-full text-left px-2 py-1.5 text-[11px] hover:bg-primary/10 ${
                        recipientId === p.user_id ? "bg-primary/15 text-primary" : "text-foreground"
                      }`}
                    >
                      <div className="truncate">{profileLabel(p)}</div>
                      {p.email && <div className="text-[10px] text-muted-foreground truncate">{p.email}</div>}
                    </button>
                  ))
                )}
              </div>
            </div>

            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Type your message... links become clickable."
              rows={4}
              className="bg-muted/50 border-border text-xs resize-none"
              maxLength={2000}
            />

            <div className="flex items-center justify-between gap-2">
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <button
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors"
                type="button"
              >
                <Paperclip className="w-3.5 h-3.5" />
                {file ? <span className="truncate max-w-[140px]">{file.name}</span> : "Attach file"}
              </button>
              {file && (
                <button
                  onClick={() => {
                    setFile(null);
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                  className="text-muted-foreground hover:text-destructive"
                  type="button"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <Button
                size="sm"
                disabled={sending || (!body.trim() && !file)}
                onClick={handleSend}
                className="ml-auto bg-primary text-primary-foreground hover:bg-primary/90 gap-1 h-8"
              >
                {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                {sending ? "Sending..." : "Send"}
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default MessagesPopover;
