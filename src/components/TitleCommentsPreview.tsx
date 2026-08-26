import { useEffect, useState } from "react";
import { MessageCircle, Lock, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  contentId: string;
  /** Extra content ids that share the same title (duplicates) */
  extraContentIds?: string[];
}

interface CommentRow {
  id: string;
  author_name: string;
  body: string;
  created_at: string;
}

const initialOf = (name: string) => (name || "U").trim().charAt(0).toUpperCase();

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days >= 1) return `${days}d ago`;
  const hours = Math.floor(diff / 3600000);
  if (hours >= 1) return `${hours}h ago`;
  return "just now";
};

/** Read-only preview of the real comment section, shown on the paywall. */
const TitleCommentsPreview = ({ contentId, extraContentIds = [] }: Props) => {
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ids = Array.from(new Set([contentId, ...extraContentIds])).filter(Boolean);
      if (!ids.length) return;
      const { data, count } = await supabase
        .from("content_comments")
        .select("id, author_name, body, created_at", { count: "exact" })
        .in("content_id", ids)
        .is("parent_id", null)
        .order("created_at", { ascending: false })
        .limit(3);
      if (cancelled) return;
      setComments((data as CommentRow[]) || []);
      setTotal(count ?? (data?.length || 0));
    })();
    return () => { cancelled = true; };
  }, [contentId, extraContentIds.join(",")]);

  if (!comments.length) return null;

  return (
    <div className="mb-6 rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <MessageCircle className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-bold text-foreground">
          Community comments{total > 0 ? ` (${total})` : ""}
        </h3>
      </div>

      <div className="space-y-2.5">
        {comments.map((c) => (
          <div key={c.id} className="flex gap-2.5">
            <div className="w-7 h-7 shrink-0 rounded-full bg-primary/15 text-primary text-[11px] font-bold flex items-center justify-center">
              {initialOf(c.author_name)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold text-foreground">{c.author_name || "Supporter"}</span>
                <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-bold">
                  <Crown className="w-2.5 h-2.5 fill-primary" /> SUPPORTER
                </span>
                <span className="text-[10px] text-muted-foreground">{timeAgo(c.created_at)}</span>
              </div>
              <p className="text-xs text-foreground/90 leading-relaxed break-words">{c.body}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground font-semibold">
        <Lock className="w-3 h-3" />
        Become a Supporter to join the conversation
      </p>
    </div>
  );
};

export default TitleCommentsPreview;
