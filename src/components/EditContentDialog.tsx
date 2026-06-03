import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";

interface ContentItem {
  id: string;
  title: string;
  year: number;
  tag: string;
  type: string;
  banner_url: string | null;
  player_url?: string | null;
  section: string;
  position: number;
  is_premium: boolean;
  is_archived?: boolean;
  supporter_player_enabled?: boolean;
}

type EpisodeLink = { title: string; type: "embed" | "redirect"; url: string };

interface Episode {
  id: string;
  content_id: string;
  title: string;
  episode_number: number;
  player_url: string | null;
  links: EpisodeLink[];
  season: number;
  is_premium: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  content: ContentItem | null;
  onSaved: () => void;
  defaults?: { section: string; type: string };
}

const EditContentDialog = ({ open, onOpenChange, content, onSaved, defaults }: Props) => {
  const [title, setTitle] = useState("");
  const [year, setYear] = useState(2025);
  const [tag, setTag] = useState("Drama");
  const [type, setType] = useState("filme");
  const [section, setSection] = useState("filmes");
  const [playerUrl, setPlayerUrl] = useState("");
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState("");
  const [bannerUrlInput, setBannerUrlInput] = useState("");
  const [isPremium, setIsPremium] = useState(false);
  const [isArchived, setIsArchived] = useState(false);
  const [synopsis, setSynopsis] = useState("");
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [movieLinks, setMovieLinks] = useState<EpisodeLink[]>([]);
  const [saving, setSaving] = useState(false);


  useEffect(() => {
    if (content) {
      setTitle(content.title);
      setYear(content.year);
      setTag(content.tag);
      setType(content.type);
      setSection(content.section);
      const legacy = content.player_url || (content as any).player_url_free || "";
      setPlayerUrl(legacy);
      if (!legacy) {
        supabase.rpc("get_content_player_url", { _content_id: content.id }).then(({ data }) => {
          if (data) setPlayerUrl(data as string);
        });
      }
      // Load multi-link list for movies/single titles
      (supabase.rpc as any)("admin_get_contents_v2", { _ids: [content.id] }).then(({ data }: any) => {
        const row = Array.isArray(data) ? data[0] : null;
        let links: EpisodeLink[] = Array.isArray(row?.links) ? row.links : [];
        if (links.length === 0 && legacy && String(legacy).trim()) {
          links = [{ title: "Watch on site", type: "embed", url: legacy }];
        }
        setMovieLinks(links);
      });
      setBannerPreview(content.banner_url || "");
      setBannerUrlInput(content.banner_url || "");
      setIsPremium(content.is_premium || false);
      setIsArchived(content.is_archived || false);
      setSynopsis((content as any).synopsis || "");
      supabase
        .rpc("admin_get_episodes", { _content_id: content.id })
        .then(({ data }) => {
          const list = ((data as any[]) || []).map((ep: any) => {
            let links: EpisodeLink[] = Array.isArray(ep.links) ? ep.links : [];
            if (links.length === 0 && ep.player_url && String(ep.player_url).trim()) {
              links = [{ title: "Watch on site", type: "embed", url: ep.player_url }];
            }
            return { ...ep, player_url: ep.player_url || "", links };
          });
          setEpisodes(list);
        });
    } else {
      setTitle("");
      setYear(2025);
      setTag("Drama");
      setType(defaults?.type || "filme");
      setSection(defaults?.section || "series");
      setPlayerUrl("");
      setBannerPreview("");
      setBannerUrlInput("");
      setIsPremium(false);
      setIsArchived(false);
      setSynopsis("");
      setEpisodes([]);
      setMovieLinks([]);
    }

  }, [content, open]);

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBannerFile(file);
      setBannerPreview(URL.createObjectURL(file));
      setBannerUrlInput("");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let bannerUrl = content?.banner_url || null;

      if (bannerFile) {
        const ext = bannerFile.name.split(".").pop();
        const path = `${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("banners")
          .upload(path, bannerFile);
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage.from("banners").getPublicUrl(path);
        bannerUrl = urlData.publicUrl;
      } else if (bannerUrlInput.trim()) {
        bannerUrl = bannerUrlInput.trim();
      }

      const cleanMovieLinks = (movieLinks || [])
        .filter(l => l && l.url && l.url.trim())
        .map(l => ({
          title: (l.title || "").trim() || "Watch",
          type: l.type === "redirect" ? "redirect" : "embed",
          url: l.url.trim(),
        }));
      const legacyMoviePlayer = cleanMovieLinks.find(l => l.type === "embed")?.url || playerUrl || null;

      const payload = {
        title,
        year,
        tag,
        type,
        section,
        player_url: legacyMoviePlayer,
        links: cleanMovieLinks as any,
        banner_url: bannerUrl,
        is_premium: isPremium,
        is_archived: isArchived,
        supporter_player_enabled: false,
        synopsis: synopsis || null,
      };


      let contentId = content?.id;

      if (content) {
        const { error } = await supabase.from("contents").update(payload).eq("id", content.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("contents").insert(payload).select('id').single();
        if (error) throw error;
        contentId = data.id;
      }

      if (contentId && (type === "serie" || type === "novela" || type === "anime")) {
        for (const ep of episodes) {
          const cleanLinks = (ep.links || [])
            .filter(l => l && l.url && l.url.trim())
            .map(l => ({
              title: (l.title || "").trim() || "Watch",
              type: l.type === "redirect" ? "redirect" : "embed",
              url: l.url.trim(),
            }));
          const legacyUrl = cleanLinks.find(l => l.type === "embed")?.url || null;
          if (ep.id.startsWith("new-")) {
            await supabase.from("episodes").insert({
              content_id: contentId,
              title: ep.title,
              episode_number: ep.episode_number,
              player_url: legacyUrl,
              links: cleanLinks as any,
              season: ep.season || 1,
              is_premium: ep.is_premium || false,
            });
          } else {
            await supabase.from("episodes").update({
              title: ep.title,
              episode_number: ep.episode_number,
              player_url: legacyUrl,
              links: cleanLinks as any,
              season: ep.season || 1,
              is_premium: ep.is_premium || false,
            }).eq("id", ep.id);
          }
        }
      }

      toast.success("Saved successfully!");
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Error saving");
    } finally {
      setSaving(false);
    }
  };

  const addEpisode = () => {
    setEpisodes([
      ...episodes,
      {
        id: `new-${Date.now()}`,
        content_id: content?.id || "",
        title: `Episode ${episodes.length + 1}`,
        episode_number: episodes.length + 1,
        player_url: "",
        links: [],
        season: Math.max(1, ...episodes.map(e => e.season || 1)),
        is_premium: false,
      },
    ]);
  };

  const addLink = (epId: string) => {
    setEpisodes(episodes.map(e => e.id === epId
      ? { ...e, links: [...(e.links || []), { title: "", type: "embed" as const, url: "" }] }
      : e));
  };

  const updateLink = (epId: string, idx: number, field: keyof EpisodeLink, value: string) => {
    setEpisodes(episodes.map(e => {
      if (e.id !== epId) return e;
      const links = [...(e.links || [])];
      links[idx] = { ...links[idx], [field]: value } as EpisodeLink;
      return { ...e, links };
    }));
  };

  const removeLink = (epId: string, idx: number) => {
    setEpisodes(episodes.map(e => e.id === epId
      ? { ...e, links: (e.links || []).filter((_, i) => i !== idx) }
      : e));
  };

  const removeEpisode = async (ep: Episode) => {
    if (!ep.id.startsWith("new-")) {
      await supabase.from("episodes").delete().eq("id", ep.id);
    }
    setEpisodes(episodes.filter((e) => e.id !== ep.id));
  };

  const updateEpisode = (id: string, field: string, value: any) => {
    setEpisodes(episodes.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="neon-text-purple">
            {content ? "Edit Content" : "New Content"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="bg-muted border-border" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-muted-foreground">Year</label>
              <Input type="number" value={year} onChange={(e) => setYear(+e.target.value)} className="bg-muted border-border" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Tag</label>
              <Input value={tag} onChange={(e) => setTag(e.target.value)} className="bg-muted border-border" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-muted-foreground">Type</label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="bg-muted border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="serie">Series</SelectItem>
                  <SelectItem value="filme">Movie</SelectItem>
                  <SelectItem value="novela">Soap Opera</SelectItem>
                  <SelectItem value="anime">Anime</SelectItem>

                  
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Section</label>
              <Select value={section} onValueChange={setSection}>
                <SelectTrigger className="bg-muted border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="series">Series</SelectItem>
                  <SelectItem value="filmes">Movies</SelectItem>
                  <SelectItem value="novelas">Soap Operas</SelectItem>
                  <SelectItem value="gl">GL Dramas</SelectItem>
                  <SelectItem value="animes">Animes</SelectItem>
                  <SelectItem value="exclusivos">Exclusives</SelectItem>

                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <label className="text-sm text-muted-foreground">Supporters only</label>
              <p className="text-[10px] text-muted-foreground/60">Locks the entire title — only Supporters can watch</p>
            </div>
            <Switch checked={isPremium} onCheckedChange={setIsPremium} />
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <label className="text-sm text-muted-foreground">Archived</label>
              <p className="text-[10px] text-muted-foreground/60">Hidden from site when enabled</p>
            </div>
            <Switch checked={isArchived} onCheckedChange={setIsArchived} />
          </div>

          <div>
            <label className="text-sm text-muted-foreground">Synopsis</label>
            <textarea
              value={synopsis}
              onChange={(e) => setSynopsis(e.target.value)}
              placeholder="Write a synopsis for the content..."
              className="w-full mt-1 rounded-md bg-muted border border-border px-3 py-2 text-base md:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 min-h-[80px] resize-y"
            />
          </div>

          {(type === "filme") && (
            <div className="space-y-2 border border-border rounded-lg p-3 bg-muted/20">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-foreground">Links (Movie)</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setMovieLinks([...(movieLinks || []), { title: "", type: "embed", url: "" }])}
                  className="h-7 gap-1 text-[11px]"
                >
                  <Plus className="w-3 h-3" /> Add link
                </Button>
              </div>
              {(movieLinks || []).length === 0 && (
                <p className="text-[11px] text-muted-foreground">No links yet. Click "Add link" to add one.</p>
              )}
              {(movieLinks || []).map((lnk, idx) => (
                <div key={idx} className="space-y-1.5 rounded-md bg-muted/40 p-2">
                  <div className="flex gap-1.5">
                    <Input
                      value={lnk.title}
                      onChange={(e) => {
                        const next = [...movieLinks];
                        next[idx] = { ...next[idx], title: e.target.value };
                        setMovieLinks(next);
                      }}
                      placeholder="Tab title (e.g. Telegram)"
                      className="bg-muted border-border text-xs flex-1"
                    />
                    <Select
                      value={lnk.type}
                      onValueChange={(v) => {
                        const next = [...movieLinks];
                        next[idx] = { ...next[idx], type: v as "embed" | "redirect" };
                        setMovieLinks(next);
                      }}
                    >
                      <SelectTrigger className="bg-muted border-border w-[110px] text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="embed">embed</SelectItem>
                        <SelectItem value="redirect">redirect</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setMovieLinks(movieLinks.filter((_, i) => i !== idx))}
                      className="text-destructive h-8 w-8"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <Input
                    value={lnk.url}
                    onChange={(e) => {
                      const next = [...movieLinks];
                      next[idx] = { ...next[idx], url: e.target.value };
                      setMovieLinks(next);
                    }}
                    placeholder="https://... or <iframe ...></iframe>"
                    className="bg-muted border-border text-xs"
                  />
                </div>
              ))}
            </div>
          )}


          <div>
            <label className="text-sm text-muted-foreground">Banner / Image</label>
            <Input
              value={bannerUrlInput}
              onChange={(e) => { setBannerUrlInput(e.target.value); setBannerFile(null); setBannerPreview(e.target.value); }}
              placeholder="https://image.tmdb.org/t/p/w780/..."
              className="bg-muted border-border mt-1"
            />
            <p className="text-xs text-muted-foreground my-1">or upload:</p>
            <input type="file" accept="image/*" onChange={handleBannerChange} className="block w-full text-sm text-muted-foreground" />
            {bannerPreview && (
              <img src={bannerPreview} alt="preview" className="mt-2 rounded-lg h-32 w-full object-cover" />
            )}
          </div>

          {(type === "serie" || type === "novela" || type === "anime") && (
            <div className="space-y-3 border-t border-border pt-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-foreground">Episodes</label>
                <Button size="sm" variant="outline" onClick={addEpisode} className="gap-1 text-xs">
                  <Plus className="w-3 h-3" /> Add
                </Button>
              </div>
              {(() => {
                const seasons = [...new Set(episodes.map(e => e.season || 1))].sort((a, b) => a - b);
                return seasons.map(s => (
                  <div key={s} className="space-y-2">
                    <p className="text-xs font-semibold text-primary">Season {s}</p>
                    {episodes.filter(e => (e.season || 1) === s).map((ep) => (
                      <div key={ep.id} className="bg-muted/50 rounded-lg p-3 space-y-2">
                        <div className="flex gap-2">
                          <Input
                            value={ep.season || 1}
                            onChange={(e) => updateEpisode(ep.id, "season", +e.target.value || 1)}
                            type="number"
                            className="w-14 bg-muted border-border"
                            placeholder="S"
                            title="Season"
                          />
                          <Input
                            value={ep.episode_number}
                            onChange={(e) => updateEpisode(ep.id, "episode_number", +e.target.value)}
                            type="number"
                            className="w-14 bg-muted border-border"
                            placeholder="Ep"
                          />
                          <Input
                            value={ep.title}
                            onChange={(e) => updateEpisode(ep.id, "title", e.target.value)}
                            className="bg-muted border-border flex-1"
                            placeholder="Episode name"
                          />
                          <Button size="icon" variant="ghost" onClick={() => removeEpisode(ep)} className="text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="space-y-2 rounded-lg border border-border bg-background/40 p-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-foreground/80">Links</span>
                            <Button size="sm" variant="outline" onClick={() => addLink(ep.id)} className="h-7 gap-1 text-[11px]">
                              <Plus className="w-3 h-3" /> Add link
                            </Button>
                          </div>
                          {(ep.links || []).length === 0 && (
                            <p className="text-[11px] text-muted-foreground">No links yet. Click "Add link" to add one.</p>
                          )}
                          {(ep.links || []).map((lnk, idx) => (
                            <div key={idx} className="space-y-1.5 rounded-md bg-muted/40 p-2">
                              <div className="flex gap-1.5">
                                <Input
                                  value={lnk.title}
                                  onChange={(e) => updateLink(ep.id, idx, "title", e.target.value)}
                                  placeholder="Tab title (e.g. Telegram)"
                                  className="bg-muted border-border text-xs flex-1"
                                />
                                <Select value={lnk.type} onValueChange={(v) => updateLink(ep.id, idx, "type", v)}>
                                  <SelectTrigger className="bg-muted border-border w-[110px] text-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="embed">embed</SelectItem>
                                    <SelectItem value="redirect">redirect</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Button size="icon" variant="ghost" onClick={() => removeLink(ep.id, idx)} className="text-destructive h-9 w-9">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                              <Input
                                value={lnk.url}
                                onChange={(e) => updateLink(ep.id, idx, "url", e.target.value)}
                                placeholder="URL or <iframe ...></iframe>"
                                className="bg-muted border-border text-xs"
                              />
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={ep.is_premium || false}
                            onCheckedChange={(v) => updateEpisode(ep.id, "is_premium", v)}
                          />
                          <span className="text-xs text-muted-foreground flex items-center gap-1">👑 Supporter only</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ));
              })()}
            </div>
          )}

          <Button onClick={handleSave} disabled={saving} className="w-full bg-primary text-primary-foreground rounded-full glow-purple gap-2">
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditContentDialog;
