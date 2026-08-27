import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Sparkles, Trash2, ArrowUp, ArrowDown, Plus, Film, Tv } from "lucide-react";
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

interface ContentRow {
  id: string;
  title: string;
  type: string;
}

interface FeaturedRow {
  id: string;
  episode_id: string | null;
  content_id: string | null;
  position: number;
  episode?: EpisodeRow | null;
  content?: ContentRow | null;
}

const FeaturedEpisodesAdmin = () => {
  const [featured, setFeatured] = useState<FeaturedRow[]>([]);
  const [allEpisodes, setAllEpisodes] = useState<EpisodeRow[]>([]);
  const [allContents, setAllContents] = useState<ContentRow[]>([]);
  const [search, setSearch] = useState("");

  const load = async () => {
    const [{ data: ep }, { data: ct }, { data: feat }] = await Promise.all([
      supabase.from("episodes").select("id, title, season, episode_number, content_id"),
      supabase.from("contents").select("id, title, type"),
      (supabase as any).from("featured_episodes").select("*").order("position", { ascending: true }),
    ]);
    const cMap = new Map((ct || []).map((c: any) => [c.id, c]));
    const eps: EpisodeRow[] = (ep || []).map((e: any) => ({
      ...e,
      content_title: (cMap.get(e.content_id) as any)?.title || "Unknown",
    }));
    const eMap = new Map(eps.map((e) => [e.id, e]));
    setAllEpisodes(eps);
    setAllContents((ct || []) as ContentRow[]);
    setFeatured(
      (feat || []).map((f: any) => ({
        ...f,
        episode: f.episode_id ? eMap.get(f.episode_id) || null : null,
        content: f.content_id ? (cMap.get(f.content_id) as any) || null : null,
      })),
    );
  };

  useEffect(() => {
    void load();
  }, []);

  const featuredEpIds = useMemo(() => new Set(featured.map((f) => f.episode_id).filter(Boolean) as string[]), [featured]);
  const featuredContentIds = useMemo(() => new Set(featured.map((f) => f.content_id).filter(Boolean) as string[]), [featured]);

  const results = useMemo(() => {
    const raw = search.trim();
    if (!raw) return { episodes: [] as EpisodeRow[], contents: [] as ContentRow[] };

    const norm = (s: string) =>
      (s || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

    let rest = norm(raw);

    // Season: "s2", "season 2", "t2"
    let wantedSeason: number | null = null;
    const seasonMatch = rest.match(/\b(?:season|temporada|s|t)\s*(\d{1,3})\b/);
    if (seasonMatch) {
      wantedSeason = parseInt(seasonMatch[1], 10);
      rest = rest.replace(seasonMatch[0], " ");
    }

    // Episode: "ep 33", "e33", "episode 33", "x33"
    let wantedEpisode: number | null = null;
    const epMatch = rest.match(/\b(?:episode|episodio|epis|ep|e|x)\s*(\d{1,4})\b/);
    if (epMatch) {
      wantedEpisode = parseInt(epMatch[1], 10);
      rest = rest.replace(epMatch[0], " ");
    } else {
      const bare = rest.match(/\b(\d{1,4})\b/);
      if (bare && rest.replace(bare[0], " ").trim().length > 0) {
        wantedEpisode = parseInt(bare[1], 10);
        rest = rest.replace(bare[0], " ");
      }
    }

    const terms = rest.split(/\s+/).map((t) => t.trim()).filter(Boolean);
    const matchesTerms = (...fields: string[]) => {
      if (terms.length === 0) return true;
      const hay = fields.map(norm).join(" ");
      return terms.every((t) => hay.includes(t));
    };

    const episodes = allEpisodes
      .filter((e) => !featuredEpIds.has(e.id))
      .filter((e) => {
        const textOk = matchesTerms(e.content_title || "", e.title);
        const seasonOk = wantedSeason === null || e.season === wantedSeason;
        const episodeOk = wantedEpisode === null || e.episode_number === wantedEpisode;
        return textOk && seasonOk && episodeOk;
      })
      .sort((a, b) => {
        const at = (a.content_title || "").localeCompare(b.content_title || "");
        if (at !== 0) return at;
        if (a.season !== b.season) return a.season - b.season;
        return a.episode_number - b.episode_number;
      })
      .slice(0, 30);

    const contents = allContents
      .filter((c) => !featuredContentIds.has(c.id))
      .filter((c) => wantedEpisode === null && wantedSeason === null && matchesTerms(c.title))
      .sort((a, b) => a.title.localeCompare(b.title))
      .slice(0, 30);

    return { episodes, contents };
  }, [search, allEpisodes, allContents, featuredEpIds, featuredContentIds]);


  const addEpisode = async (ep: EpisodeRow) => {
    const nextPos = featured.length;
    const { error } = await (supabase as any)
      .from("featured_episodes")
      .insert({ episode_id: ep.id, content_id: null, position: nextPos });
    if (error) { toast.error(error.message); return; }
    setSearch("");
    toast.success("Added to Recent Updates");
    void load();
  };

  const addContent = async (c: ContentRow) => {
    const nextPos = featured.length;
    const { error } = await (supabase as any)
      .from("featured_episodes")
      .insert({ episode_id: null, content_id: c.id, position: nextPos });
    if (error) { toast.error(error.message); return; }
    setSearch("");
    toast.success("Added to Recent Updates");
    void load();
  };

  const removeFeatured = async (id: string) => {
    const { error } = await (supabase as any).from("featured_episodes").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
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
          Recent Updates (episodes & titles)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Search episodes, movies, series or any title</label>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Type to search..."
              className="bg-muted border-border pl-9"
            />
          </div>
          {(results.episodes.length > 0 || results.contents.length > 0) && (
            <div className="mt-2 max-h-72 overflow-y-auto border border-border rounded-lg divide-y divide-border/50">
              {results.contents.length > 0 && (
                <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-muted-foreground bg-muted/30">Titles (Movies / Series)</div>
              )}
              {results.contents.map((c) => (
                <button
                  key={`c-${c.id}`}
                  onClick={() => addContent(c)}
                  className="w-full text-left px-3 py-2 hover:bg-muted/40 transition-colors flex items-center gap-3"
                >
                  <Film className="w-4 h-4 text-accent flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{c.title}</p>
                    <p className="text-xs text-muted-foreground truncate capitalize">{c.type}</p>
                  </div>
                  <Plus className="w-4 h-4 text-primary" />
                </button>
              ))}
              {results.episodes.length > 0 && (
                <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-muted-foreground bg-muted/30">Episodes</div>
              )}
              {results.episodes.map((e) => (
                <button
                  key={`e-${e.id}`}
                  onClick={() => addEpisode(e)}
                  className="w-full text-left px-3 py-2 hover:bg-muted/40 transition-colors flex items-center gap-3"
                >
                  <Tv className="w-4 h-4 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">
                      {e.content_title} <span className="text-muted-foreground">— S{e.season}E{e.episode_number}</span>
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{e.title}</p>
                  </div>
                  <Plus className="w-4 h-4 text-primary" />
                </button>
              ))}
            </div>
          )}
          {search.trim() && results.episodes.length === 0 && results.contents.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-3">No matches.</p>
          )}
        </div>

        <div className="space-y-1">
          <p className="text-xs text-muted-foreground mb-1">
            Featured ({featured.length}) — shown on the homepage
          </p>
          {featured.length === 0 ? (
            <p className="text-muted-foreground text-center text-sm py-6">Nothing featured yet.</p>
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
                      <p className="text-sm text-foreground truncate flex items-center gap-1.5">
                        <Tv className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                        {f.episode.content_title}{" "}
                        <span className="text-muted-foreground">— S{f.episode.season}E{f.episode.episode_number}</span>
                      </p>
                      <p className="text-xs text-muted-foreground truncate pl-5">{f.episode.title}</p>
                    </>
                  ) : f.content ? (
                    <p className="text-sm text-foreground truncate flex items-center gap-1.5">
                      <Film className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                      {f.content.title}
                      <span className="text-[10px] text-muted-foreground capitalize ml-1">({f.content.type})</span>
                    </p>
                  ) : (
                    <p className="text-sm text-destructive">Item missing</p>
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
