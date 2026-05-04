import { useEffect, useState } from "react";
import { MessageCircle, Send, Trash2 } from "lucide-react";
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
}

interface Props {
  contentId: string;
}

const commentSchema = z.object({
  body: z
    .string()
    .trim()
    .nonempty({ message: "Comment cannot be empty" })
    .max(1000, { message: "Comment must be less than 1000 characters" }),
});

const formatDate = (iso: string) => {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }) + " · " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
};

const CommentsSection = ({ contentId }: Props) => {
  const { user, isAdmin } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [authorName, setAuthorName] = useState<string>("");

  const load = async () => {
    const { data } = await supabase
      .from("content_comments")
      .select("*")
      .eq("content_id", contentId)
      .order("created_at", { ascending: false })
      .limit(200);
    setComments((data as Comment[]) || []);
  };

  useEffect(() => {
    if (!contentId) return;
    void load();
  }, [contentId]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setAuthorName("");
        return;
      }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Sign in to leave a comment");
      return;
    }
    const parsed = commentSchema.safeParse({ body });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("content_comments").insert({
      content_id: contentId,
      user_id: user.id,
      author_name: authorName || "User",
      body: parsed.data.body,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setBody("");
    void load();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("content_comments").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setComments((prev) => prev.filter((c) => c.id !== id));
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
        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground/70 text-center py-6">Be the first to comment.</p>
        ) : (
          comments.map((c) => {
            const canDelete = isAdmin || (user && user.id === c.user_id);
            return (
              <div key={c.id} className="rounded-xl bg-card border border-border p-3 sm:p-4">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                      {(c.author_name || "U").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{c.author_name || "User"}</p>
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
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};

export default CommentsSection;
