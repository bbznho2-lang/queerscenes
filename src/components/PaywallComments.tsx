import { useMemo } from "react";
import { Star } from "lucide-react";
import { getPaywallComments, type PaywallComment } from "@/lib/paywall-comments";

interface Props {
  contentId: string;
  title?: string | null;
  type?: string | null;
  hasMultipleSeasons?: boolean;
  characters?: string[];
  custom?: { name: string; quote: string }[] | null;
  compact?: boolean;
}

const initials = (name: string) => name.trim().charAt(0).toUpperCase() || "S";

const PaywallComments = ({ contentId, title, type, hasMultipleSeasons, characters, custom, compact }: Props) => {
  const comments: PaywallComment[] = useMemo(() => {
    const cleaned = (custom || []).filter((t) => t?.quote?.trim());
    if (cleaned.length) {
      return cleaned.map((t) => ({ name: t.name?.trim() || "Supporter", quote: t.quote.trim() }));
    }
    return getPaywallComments(contentId, 3, { title, type, hasMultipleSeasons, characters });
  }, [contentId, custom, title, type, hasMultipleSeasons, characters]);


  if (!comments.length) return null;

  return (
    <div className={`w-full ${compact ? "max-w-md" : "max-w-2xl mx-auto"} space-y-2 mb-6 text-left`}>
      <p className="qs-section-label text-center text-[11px] text-muted-foreground font-bold uppercase tracking-wider">
        What supporters say about joining now
      </p>
      {comments.map((c, i) => (
        <div
          key={`${c.name}-${i}`}
          className="rounded-xl border border-border bg-card/70 backdrop-blur-sm px-3 py-2.5 flex gap-3"
        >
          <div className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 text-white text-xs font-bold flex items-center justify-center">
            {initials(c.name)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-foreground">{c.name}</span>
              <span className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, s) => (
                  <Star key={s} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                ))}
              </span>
              {c.meta && <span className="text-[10px] text-muted-foreground">{c.meta}</span>}
            </div>
            <p className="text-xs text-foreground/90 leading-relaxed mt-0.5">{c.quote}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PaywallComments;
