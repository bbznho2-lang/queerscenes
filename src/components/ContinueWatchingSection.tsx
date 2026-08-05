import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { History, Play, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { slugify } from "@/lib/slug";
import { removeWatchProgress } from "@/lib/watch-progress";
import { useAuth } from "@/hooks/useAuth";

interface ContinueItem {
  contentId: string;
  title: string;
  bannerUrl: string | null;
  tag: string;
  year: number;
  season: number | null;
  episodeNumber: number | null;
  episodeTitle: string | null;
  episodeId: string | null;
}

const ContinueWatchingSection = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<ContinueItem[]>([]);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    if (!user?.id) {
      setItems([]);
      return;
    }

    const { data: rows } = await (supabase as any)
      .from("watch_progress")
      .select("content_id, episode_id, season, episode_number, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(20);

    if (!rows?.length) {
      setItems([]);
      return;
    }

    const contentIds = Array.from(new Set(rows.map((r: any) => r.content_id)));
    const episodeIds = rows.map((r: any) => r.episode_id).filter(Boolean);

    const [{ data: contents }, { data: episodes }] = await Promise.all([
      supabase
        .from("contents")
        .select("id, title, banner_url, tag, year, is_archived")
        .in("id", contentIds as string[]),
      episodeIds.length
        ? supabase.from("episodes").select("id, title, season, episode_number").in("id", episodeIds as string[])
        : Promise.resolve({ data: [] as any[] } as any),
    ]);

    const cMap = new Map((contents || []).filter((c: any) => !c.is_archived).map((c: any) => [c.id, c]));
    const eMap = new Map((episodes || []).map((e: any) => [e.id, e]));

    const seenTitles = new Set<string>();
    const mapped: ContinueItem[] = [];

    for (const row of rows as any[]) {
      const c: any = cMap.get(row.content_id);
      if (!c) continue;
      const key = c.title.toLowerCase();
      if (seenTitles.has(key)) continue;
      seenTitles.add(key);
      const ep: any = row.episode_id ? eMap.get(row.episode_id) : null;
      mapped.push({
        contentId: c.id,
        title: c.title,
        bannerUrl: c.banner_url,
        tag: c.tag,
        year: c.year,
        season: ep?.season ?? row.season ?? null,
        episodeNumber: ep?.episode_number ?? row.episode_number ?? null,
        episodeTitle: ep?.title ?? null,
        episodeId: row.episode_id ?? null,
      });
      if (mapped.length >= 12) break;
    }

    setItems(mapped);
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleRemove = async (contentId: string) => {
    setItems((prev) => prev.filter((i) => i.contentId !== contentId));
    if (user?.id) await removeWatchProgress(user.id, contentId);
  };

  if (!user || items.length === 0) return null;

  return (
    <section className="py-6 sm:py-10 px-4">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold mb-6 flex items-center gap-2 text-foreground">
          <History className="w-6 h-6 text-accent" />
          <span className="neon-text-blue">Continue Watching</span>
        </h2>
        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide" style={{ scrollbarWidth: "none" }}>
          {items.map((item) => (
            <div
              key={item.contentId}
              onClick={() => navigate(`/title/${slugify(item.title)}`)}
              className="group relative flex-shrink-0 w-[70vw] sm:w-[280px] cursor-pointer rounded-xl overflow-hidden bg-card border border-border hover:border-accent/50 transition-all"
            >
              <div className="relative aspect-video bg-muted">
                <img
                  src={item.bannerUrl || "/placeholder.svg"}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleRemove(item.contentId);
                  }}
                  title="Remove from Continue Watching"
                  className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-background/80 hover:bg-destructive/80 flex items-center justify-center transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-foreground" />
                </button>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-12 h-12 rounded-full bg-accent/90 flex items-center justify-center">
                    <Play className="w-5 h-5 text-accent-foreground" />
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-foreground/10">
                  <div className="h-full w-1/3 bg-accent" />
                </div>
              </div>
              <div className="p-3">
                <p className="text-[11px] text-accent font-semibold uppercase tracking-wide mb-1">
                  {item.season && item.episodeNumber
                    ? `S${item.season} · E${item.episodeNumber}`
                    : `${item.tag} · ${item.year}`}
                </p>
                <h3 className="text-sm font-semibold text-foreground line-clamp-1">{item.title}</h3>
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {item.episodeTitle || "Resume watching"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ContinueWatchingSection;
