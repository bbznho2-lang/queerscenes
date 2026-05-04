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
  player_url: string | null;
  section: string;
  position: number;
  is_premium: boolean;
  is_archived?: boolean;
}

interface Episode {
  id: string;
  content_id: string;
  title: string;
  episode_number: number;
  player_url: string | null;
  player_url_free: string | null;
  player_url_premium: string | null;
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
  const [playerUrlFree, setPlayerUrlFree] = useState("");
  const [playerUrlPremium, setPlayerUrlPremium] = useState("");
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState("");
  const [bannerUrlInput, setBannerUrlInput] = useState("");
  const [isPremium, setIsPremium] = useState(false);
  const [isArchived, setIsArchived] = useState(false);
  const [synopsis, setSynopsis] = useState("");
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (content) {
      setTitle(content.title);
      setYear(content.year);
      setTag(content.tag);
      setType(content.type);
      setSection(content.section);
      setPlayerUrl(content.player_url || "");
      setPlayerUrlFree((content as any).player_url_free || "");
      setPlayerUrlPremium((content as any).player_url_premium || "");
      setBannerPreview(content.banner_url || "");
      setBannerUrlInput(content.banner_url || "");
      setIsPremium(content.is_premium || false);
      setIsArchived(content.is_archived || false);
      setSynopsis((content as any).synopsis || "");
      supabase
        .from("episodes")
        .select("*")
        .eq("content_id", content.id)
        .order("episode_number")
        .then(({ data }) => setEpisodes(data || []));
    } else {
      setTitle("");
      setYear(2025);
      setTag("Drama");
      setType(defaults?.type || "filme");
      setSection(defaults?.section || "series");
      setPlayerUrl("");
      setPlayerUrlFree("");
      setPlayerUrlPremium("");
      setBannerPreview("");
      setBannerUrlInput("");
      setIsPremium(false);
      setIsArchived(false);
      setSynopsis("");
      setEpisodes([]);
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

      const payload = {
        title,
        year,
        tag,
        type,
        section,
        player_url: playerUrl || null,
        player_url_free: playerUrlFree || null,
        player_url_premium: playerUrlPremium || null,
        banner_url: bannerUrl,
        is_premium: isPremium,
        is_archived: isArchived,
        synopsis: synopsis || null,
      };

      let contentId = content?.id;

      if (content) {
        const { error } = await supabase.from("contents").update(payload).eq("id", content.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("contents").insert(payload).select().single();
        if (error) throw error;
        contentId = data.id;
      }

      if (contentId && (type === "serie" || type === "novela" || type === "anime")) {
        for (const ep of episodes) {
          if (ep.id.startsWith("new-")) {
            await supabase.from("episodes").insert({
              content_id: contentId,
              title: ep.title,
              episode_number: ep.episode_number,
              player_url: ep.player_url,
              player_url_free: ep.player_url_free || null,
              player_url_premium: ep.player_url_premium || null,
              season: ep.season || 1,
              is_premium: ep.is_premium || false,
            });
          } else {
            await supabase.from("episodes").update({
              title: ep.title,
              episode_number: ep.episode_number,
              player_url: ep.player_url,
              player_url_free: ep.player_url_free || null,
              player_url_premium: ep.player_url_premium || null,
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
        player_url_free: "",
        player_url_premium: "",
        season: Math.max(1, ...episodes.map(e => e.season || 1)),
        is_premium: false,
      },
    ]);
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
                  
                  <SelectItem value="exclusivos">Exclusives</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between py-2">
            <label className="text-sm text-muted-foreground">Premium Content?</label>
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

          <div>
            <label className="text-sm text-muted-foreground">Player URL (external embed)</label>
            <Input
              value={playerUrl}
              onChange={(e) => setPlayerUrl(e.target.value)}
              placeholder="https://youtube.com/embed/..."
              className="bg-muted border-border"
            />
          </div>

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
                        <Input
                          value={ep.player_url || ""}
                          onChange={(e) => updateEpisode(ep.id, "player_url", e.target.value)}
                          placeholder="Player URL (embed)"
                          className="bg-muted border-border text-xs"
                        />
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={ep.is_premium || false}
                            onCheckedChange={(v) => updateEpisode(ep.id, "is_premium", v)}
                          />
                          <span className="text-xs text-muted-foreground">Premium</span>
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
