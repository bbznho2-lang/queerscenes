import { useEffect, useMemo, useState } from "react";
import { MessageCircle, Send, Trash2, Reply, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { z } from "zod";

interface Comment {
  id: string;
  content_id: string;
  user_id: string;
  author_name: string;
  body: string;
  created_at: string;
  parent_id: string | null;
}

interface ProfileLite {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  is_premium: boolean | null;
  premium_expires_at: string | null;
}

interface Props {
  contentId: string;
}

const commentSchema = z.object({
  body: z.string().trim().nonempty({ message: "Comment cannot be empty" }).max(1000, { message: "Max 1000 characters" }),
});

const formatDate = (iso: string) => {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { day: "2-digit", month: "short" }) + " · " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  } catch { return iso; }
};

const initialOf = (name: string) => (name || "U").trim().charAt(0).toUpperCase();

const CommentsSection = ({ contentId }: Props) => {
  const { user, isAdmin } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileLite>>({});
  const [body, setBody] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [authorName, setAuthorName] = useState<string>("");

  const load = async () => {
    const { data } = await supabase
      .from("content_comments")
      .select("*")
      .eq("content_id", contentId)
      .order("created_at", { ascending: false })
      .limit(500);
    const list = (data as Comment[]) || [];
    setComments(list);

    const ids = Array.from(new Set(list.map((c) => c.user_id)));
    if (ids.length) {
      const { data: sup } = await supabase.rpc("get_supporter_user_ids", { _user_ids: ids } as any);
      const supSet = new Set(((sup as Array<{ user_id: string }> | null) || []).map((s) => s.user_id));
      const map: Record<string, ProfileLite> = {};
      ids.forEach((uid) => {
        map[uid] = { user_id: uid, first_name: null, last_name: null, email: null, is_premium: supSet.has(uid), premium_expires_at: null };
      });
      setProfiles(map);
    } else {
      setProfiles({});
    }
  };

  useEffect(() => { if (contentId) void load(); }, [contentId]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) { setAuthorName(""); return; }
      const { data } = await supabase
        .from("profiles")
        .select("first_name, last_name, email")
        .eq("user_id", user.id)
        .maybeSingle();
      const name = [data?.first_name, data?.last_name].filter(Boolean).join(" ").trim();
      setAuthorName(name || data?.email?.split("@")[0] || "User");
    };
    void fetchProfile();
  }, [user]);

  const isSupporter = (uid: string) => {
    const p = profiles[uid];
    if (!p) return false;
    const notExpired = !p.premium_expires_at || new Date(p.premium_expires_at) > new Date();
    return Boolean(p.is_premium && notExpired);
  };

  const submitComment = async (text: string, parent: string | null) => {
    if (!user) { toast.error("Sign in to comment"); return false; }
    const parsed = commentSchema.safeParse({ body: text });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return false; }
    setLoading(true);
    const { error } = await supabase.from("content_comments").insert({
      content_id: contentId,
      user_id: user.id,
      author_name: authorName || "User",
      body: parsed.data.body,
      parent_id: parent,
    } as any);
    setLoading(false);
    if (error) { toast.error(error.message); return false; }
    await load();
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await submitComment(body, null);
    if (ok) setBody("");
  };

  const handleReply = async (parent: string) => {
    const ok = await submitComment(replyBody, parent);
    if (ok) { setReplyBody(""); setReplyTo(null); }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("content_comments").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    void load();
  };

  const { roots, repliesByParent } = useMemo(() => {
    const roots: Comment[] = [];
    const repliesByParent: Record<string, Comment[]> = {};
    for (const c of comments) {
      if (c.parent_id) {
        (repliesByParent[c.parent_id] ||= []).push(c);
      } else {
        roots.push(c);
      }
    }
    Object.values(repliesByParent).forEach((arr) => arr.sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at)));
    return { roots, repliesByParent };
  }, [comments]);

  const Avatar = ({ uid, name }: { uid: string; name: string }) => {
    const supporter = isSupporter(uid);
    return (
      <div className="relative flex-shrink-0">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${supporter ? "bg-primary text-primary-foreground ring-2 ring-primary/40" : "bg-primary/15 text-primary"}`}>
          {initialOf(name)}
        </div>
        {supporter && (
          <Crown className="absolute -top-1 -right-1 w-3 h-3 text-primary fill-primary drop-shadow" />
        )}
      </div>
    );
  };

  const CommentItem = ({ c, isReply = false }: { c: Comment; isReply?: boolean }) => {
    const canDelete = isAdmin || (user && user.id === c.user_id);
    const supporter = isSupporter(c.user_id);
    return (
      <div className={`rounded-xl bg-card border border-border p-3 sm:p-4 ${isReply ? "ml-6 sm:ml-10" : ""}`}>
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <Avatar uid={c.user_id} name={c.author_name} />
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate flex items-center gap-1">
                {c.author_name || "User"}
                {supporter && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-bold">SUPPORTER</span>}
              </p>
              <p className="text-[10px] text-muted-foreground">{formatDate(c.created_at)}</p>
            </div>
          </div>
          {canDelete && (
            <button onClick={() => handleDelete(c.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1" title="Delete">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <p className="text-sm text-foreground/90 whitespace-pre-wrap break-words leading-relaxed">{c.body}</p>

        {!isReply && user && (
          <div className="mt-2">
            <button
              onClick={() => { setReplyTo(replyTo === c.id ? null : c.id); setReplyBody(""); }}
              className="text-[11px] text-muted-foreground hover:text-primary inline-flex items-center gap-1"
            >
              <Reply className="w-3 h-3" /> {replyTo === c.id ? "Cancel" : "Reply"}
            </button>
            {replyTo === c.id && (
              <div className="mt-2 space-y-2">
                <Textarea
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  placeholder={`Reply to ${c.author_name}…`}
                  maxLength={1000}
                  className="bg-muted border-border resize-y min-h-[60px] text-sm"
                />
                <div className="flex justify-end">
                  <Button onClick={() => handleReply(c.id)} disabled={loading} size="sm" className="rounded-full bg-primary text-primary-foreground gap-1">
                    <Send className="w-3 h-3" /> Reply
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {!isReply && repliesByParent[c.id]?.length > 0 && (
          <div className="mt-3 space-y-2">
            {repliesByParent[c.id].map((r) => <CommentItem key={r.id} c={r} isReply />)}
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="mt-8 sm:mt-10 border-t border-border pt-6">
      <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
        <MessageCircle className="w-5 h-5 text-primary" />
        Comments <span className="text-muted-foreground text-sm font-normal">({comments.length})</span>
      </h3>

      {user ? (
        <form onSubmit={handleSubmit} className="mb-6 space-y-2">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Share your thoughts about this title…"
            maxLength={1000}
            className="bg-muted border-border resize-y min-h-[80px]"
          />
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground">{body.length}/1000</p>
            <Button type="submit" disabled={loading} size="sm" className="rounded-full bg-primary text-primary-foreground gap-1">
              <Send className="w-3.5 h-3.5" /> {loading ? "Posting…" : "Post"}
            </Button>
          </div>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground mb-6">Sign in to leave a comment.</p>
      )}

      <div className="space-y-3">
        {roots.length === 0 ? (
          <p className="text-sm text-muted-foreground/70 text-center py-6">Be the first to comment.</p>
        ) : (
          roots.map((c) => <CommentItem key={c.id} c={c} />)
        )}
      </div>
    </section>
  );
};

export default CommentsSection;
