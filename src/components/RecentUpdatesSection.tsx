import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Play, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface FeaturedItem {
  id: string;
  episode_id: string;
  position: number;
  episode: {
    id: string;
    title: string;
    season: number;
    episode_number: number;
    content_id: string;
    content: {
      id: string;
      title: string;
      banner_url: string | null;
      tag: string;
      year: number;
    } | null;
  } | null;
}

const RecentUpdatesSection = () => {
  const [items, setItems] = useState<FeaturedItem[]>([]);
  const navigate = useNavigate();

  const load = async () => {
    const { data: featured } = await (supabase as any)
      .from("featured_episodes")
      .select("id, episode_id, position")
      .order("position", { ascending: true })
      .order("created_at", { ascending: false });
    if (!featured?.length) {
      setItems([]);
      return;
    }
    const epIds = featured.map((f: any) => f.episode_id);
    const { data: episodes } = await supabase
      .from("episodes")
      .select("id, title, season, episode_number, content_id")
      .in("id", epIds);
    const contentIds = Array.from(new Set((episodes || []).map((e: any) => e.content_id)));
    const { data: contents } = await supabase
      .from("contents")
      .select("id, title, banner_url, tag, year")
      .in("id", contentIds);
    const cMap = new Map((contents || []).map((c: any) => [c.id, c]));
    const eMap = new Map((episodes || []).map((e: any) => [e.id, { ...e, content: cMap.get(e.content_id) || null }]));
    setItems(
      featured.map((f: any) => ({
        ...f,
        episode: eMap.get(f.episode_id) || null,
      })).filter((i: FeaturedItem) => i.episode && i.episode.content),
    );
  };

  useEffect(() => {
    void load();
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="py-10 sm:py-16 px-4">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold mb-6 flex items-center gap-2 text-foreground">
          <Sparkles className="w-6 h-6 text-primary" />
          <span className="neon-text-purple">Recent Updates</span>
        </h2>
        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide" style={{ scrollbarWidth: "none" }}>
          {items.map((item) => {
            const ep = item.episode!;
            const c = ep.content!;
            return (
              <div
                key={item.id}
                onClick={() => navigate(`/player/${c.id}`)}
                className="group flex-shrink-0 w-[70vw] sm:w-[280px] cursor-pointer rounded-xl overflow-hidden bg-card border border-border hover:border-primary/50 transition-all"
              >
                <div className="relative aspect-video bg-muted">
                  <img
                    src={c.banner_url || "/placeholder.svg"}
                    alt={c.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-primary/90 text-primary-foreground text-[10px] font-bold uppercase tracking-wide">
                    New
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center glow-purple">
                      <Play className="w-5 h-5 text-primary-foreground" />
                    </div>
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-[11px] text-primary font-semibold uppercase tracking-wide mb-1">
                    S{ep.season} · E{ep.episode_number}
                  </p>
                  <h3 className="text-sm font-semibold text-foreground line-clamp-1">{c.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-1">{ep.title}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default RecentUpdatesSection;
