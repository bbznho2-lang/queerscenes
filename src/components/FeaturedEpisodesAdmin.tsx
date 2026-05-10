import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Sparkles, Trash2, ArrowUp, ArrowDown, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EpisodeRow {
  id: string;
  title: string;
  season: number;
  episode_number: number;
  content_id: string;
  content_title?: string;
}

interface FeaturedRow {
  id: string;
  episode_id: string;
  position: number;
  episode?: EpisodeRow | null;
}

const FeaturedEpisodesAdmin = () => {
  const [featured, setFeatured] = useState<FeaturedRow[]>([]);
  const [allEpisodes, setAllEpisodes] = useState<EpisodeRow[]>([]);
  const [search, setSearch] = useState("");

  const load = async () => {
    const [{ data: ep }, { data: ct }, { data: feat }] = await Promise.all([
      supabase.from("episodes").select("id, title, season, episode_number, content_id"),
      supabase.from("contents").select("id, title"),
      (supabase as any).from("featured_episodes").select("*").order("position", { ascending: true }),
    ]);
    const cMap = new Map((ct || []).map((c: any) => [c.id, c.title]));
    const eps: EpisodeRow[] = (ep || []).map((e: any) => ({
      ...e,
      content_title: cMap.get(e.content_id) || "Unknown",
    }));
    const eMap = new Map(eps.map((e) => [e.id, e]));
    setAllEpisodes(eps);
    setFeatured(
      (feat || []).map((f: any) => ({ ...f, episode: eMap.get(f.episode_id) || null })),
    );
  };

  useEffect(() => {
    void load();
  }, []);

  const featuredIds = useMemo(() => new Set(featured.map((f) => f.episode_id)), [featured]);

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return allEpisodes
      .filter((e) => !featuredIds.has(e.id))
      .filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          (e.content_title || "").toLowerCase().includes(q),
      )
      .slice(0, 10);
  }, [search, allEpisodes, featuredIds]);

  const addEpisode = async (ep: EpisodeRow) => {
    const nextPos = featured.length;
    const { error } = await (supabase as any)
      .from("featured_episodes")
      .insert({ episode_id: ep.id, position: nextPos });
    if (error) {
      toast.error(error.message);
      return;
    }
    setSearch("");
    toast.success("Added to Recent Updates");
    void load();
  };

  const removeFeatured = async (id: string) => {
    const { error } = await (supabase as any).from("featured_episodes").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    void load();
  };

  const move = async (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= featured.length) return;
    const a = featured[idx];
    const b = featured[newIdx];
    await (supabase as any).from("featured_episodes").update({ position: b.position }).eq("id", a.id);
    await (supabase as any).from("featured_episodes").update({ position: a.position }).eq("id", b.id);
    void load();
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Sparkles className="w-5 h-5 text-primary" />
          Recent Updates (curated episodes)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Search episodes by title or show</label>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Type to search..."
              className="bg-muted border-border pl-9"
            />
          </div>
          {results.length > 0 && (
            <div className="mt-2 max-h-60 overflow-y-auto border border-border rounded-lg divide-y divide-border/50">
              {results.map((e) => (
                <button
                  key={e.id}
                  onClick={() => addEpisode(e)}
                  className="w-full text-left px-3 py-2 hover:bg-muted/40 transition-colors flex items-center gap-3"
                >
                  <Plus className="w-4 h-4 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">
                      {e.content_title} <span className="text-muted-foreground">— S{e.season}E{e.episode_number}</span>
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{e.title}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
          {search.trim() && results.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-3">No matches.</p>
          )}
        </div>

        <div className="space-y-1">
          <p className="text-xs text-muted-foreground mb-1">
            Featured ({featured.length}) — shown on the homepage
          </p>
          {featured.length === 0 ? (
            <p className="text-muted-foreground text-center text-sm py-6">No episodes featured yet.</p>
          ) : (
            featured.map((f, idx) => (
              <div
                key={f.id}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/40 bg-muted/20"
              >
                <span className="w-6 text-center text-xs font-bold text-primary">{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  {f.episode ? (
                    <>
                      <p className="text-sm text-foreground truncate">
                        {f.episode.content_title}{" "}
                        <span className="text-muted-foreground">
                          — S{f.episode.season}E{f.episode.episode_number}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{f.episode.title}</p>
                    </>
                  ) : (
                    <p className="text-sm text-destructive">Episode missing</p>
                  )}
                </div>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => move(idx, -1)} disabled={idx === 0}>
                  <ArrowUp className="w-3.5 h-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => move(idx, 1)} disabled={idx === featured.length - 1}>
                  <ArrowDown className="w-3.5 h-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeFeatured(f.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default FeaturedEpisodesAdmin;
