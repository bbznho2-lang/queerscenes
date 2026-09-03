import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sparkles, Save, RotateCcw, Plus, Trash2, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getPaywallComments } from "@/lib/paywall-comments";

export const DEFAULT_PAYWALL_TEXT = "Subtitles: 🇬🇧";

type ContentOpt = { id: string; title: string; type?: string | null };
type Testimonial = { name: string; quote: string };

const PaywallCustomizationsAdmin = () => {
  const [contents, setContents] = useState<ContentOpt[]>([]);
  const [customMap, setCustomMap] = useState<Record<string, string>>({});
  const [testimonialMap, setTestimonialMap] = useState<Record<string, Testimonial[]>>({});
  const [languageMap, setLanguageMap] = useState<Record<string, string[]>>({});
  const [contentId, setContentId] = useState<string>("");
  const [text, setText] = useState(DEFAULT_PAYWALL_TEXT);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [languages, setLanguages] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [seasonMap, setSeasonMap] = useState<Record<string, number[]>>({});

  const load = async () => {
    const [{ data: c }, { data: r }] = await Promise.all([
      supabase.from("contents").select("id, title, type").order("title"),
      (supabase as any).from("paywall_customizations").select("content_id, custom_text, testimonials, languages"),
    ]);
    setContents((c || []) as ContentOpt[]);
    const map: Record<string, string> = {};
    const tMap: Record<string, Testimonial[]> = {};
    const lMap: Record<string, string[]> = {};
    (r || []).forEach((x: any) => {
      if (x.custom_text) map[x.content_id] = x.custom_text;
      if (Array.isArray(x.testimonials) && x.testimonials.length) {
        tMap[x.content_id] = x.testimonials
          .filter((t: any) => t && typeof t.quote === "string")
          .map((t: any) => ({ name: String(t.name || ""), quote: String(t.quote || "") }));
      }
      if (Array.isArray(x.languages) && x.languages.length) {
        lMap[x.content_id] = x.languages.map((l: any) => String(l));
      }
    });
    setCustomMap(map);
    setTestimonialMap(tMap);
    setLanguageMap(lMap);
  };

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    if (!contentId) {
      setText(DEFAULT_PAYWALL_TEXT);
      setTestimonials([]);
      setLanguages("");
      return;
    }
    setText(customMap[contentId] || DEFAULT_PAYWALL_TEXT);
    setTestimonials(testimonialMap[contentId] || []);
    setLanguages((languageMap[contentId] || []).join(", "));
    void (async () => {
      const { data } = await supabase.from("episodes").select("season").eq("content_id", contentId);
      const seasons = [...new Set((data || []).map((e: any) => Number(e.season || 1)))];
      setSeasonMap((prev) => ({ ...prev, [contentId]: seasons }));
    })();
  }, [contentId, customMap, testimonialMap, languageMap]);

  const isCustom = useMemo(
    () => contentId && customMap[contentId] && customMap[contentId] !== DEFAULT_PAYWALL_TEXT,
    [contentId, customMap]
  );

  const autoComments = useMemo(
    () => {
      if (!contentId) return [];
      const opt = contents.find((o) => o.id === contentId);
      const seasons = seasonMap[contentId] || [];
      return getPaywallComments(contentId, 3, {
        title: opt?.title,
        type: opt?.type,
        hasMultipleSeasons: seasons.length > 1,
      });
    },
    [contentId, contents, seasonMap]
  );

  const handleSave = async () => {
    if (!contentId) { toast.error("Select a title"); return; }
    setSaving(true);
    try {
      const trimmed = text.trim();
      const cleanTestimonials = testimonials
        .map((t) => ({ name: t.name.trim(), quote: t.quote.trim() }))
        .filter((t) => t.quote.length > 0)
        .slice(0, 6);
      const payload = {
        content_id: contentId,
        custom_text: trimmed && trimmed !== DEFAULT_PAYWALL_TEXT ? trimmed : null,
        testimonials: cleanTestimonials,
        languages: languages
          .split(",")
          .map((l) => l.trim())
          .filter(Boolean)
          .slice(0, 12),
      };
      const { error } = await (supabase as any)
        .from("paywall_customizations")
        .upsert(payload, { onConflict: "content_id" });
      if (error) throw error;
      toast.success("Saved");
      await load();
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!contentId) return;
    setText(DEFAULT_PAYWALL_TEXT);
    setTestimonials([]);
    setLanguages("");
    const { error } = await (supabase as any)
      .from("paywall_customizations")
      .delete()
      .eq("content_id", contentId);
    if (error) { toast.error(error.message); return; }
    toast.success("Reset to default");
    await load();
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Sparkles className="w-5 h-5 text-primary" />
          Paywall text & comments (per title)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Title</label>
          <select
            value={contentId}
            onChange={(e) => setContentId(e.target.value)}
            className="w-full rounded-md bg-muted border border-border px-3 py-2 text-sm text-foreground"
          >
            <option value="">— Select a title —</option>
            {contents.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}{customMap[c.id] || testimonialMap[c.id] ? "  ✎" : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">
            Available languages (shown at the top of the paywall) — separate with commas
          </label>
          <Input
            value={languages}
            onChange={(e) => setLanguages(e.target.value)}
            disabled={!contentId}
            placeholder="🇬🇧 English, 🇪🇸 Español, 🇫🇷 Français"
            className="bg-muted border-border"
            maxLength={200}
          />
          {languages.trim() && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {languages.split(",").map((l) => l.trim()).filter(Boolean).map((l, i) => (
                <span key={i} className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[11px] font-semibold">
                  {l}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs text-muted-foreground">
              Paywall text {isCustom ? "(custom)" : "(default)"}
            </label>
            {contentId && (
              <button
                type="button"
                onClick={() => setText(DEFAULT_PAYWALL_TEXT)}
                className="text-[11px] text-muted-foreground hover:text-foreground"
              >
                Load default
              </button>
            )}
          </div>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            disabled={!contentId}
            className="bg-muted border-border"
          />
        </div>

        <div className="space-y-2 pt-2 border-t border-border">
          <div className="flex items-center justify-between">
            <label className="text-xs text-muted-foreground">
              Supporter comments {testimonials.length ? "(custom)" : "(auto — unique per title)"}
            </label>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={!contentId || testimonials.length > 0 || !autoComments.length}
              onClick={() => setTestimonials(autoComments.map((c) => ({ name: c.name, quote: c.quote })))}
            >
              <Pencil className="w-3.5 h-3.5 mr-1" /> Edit auto comments
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={!contentId || testimonials.length >= 6}
              onClick={() => setTestimonials((v) => [...v, { name: "", quote: "" }])}
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Add comment
            </Button>
          </div>

          {testimonials.length === 0 && contentId && (
            <div className="rounded-lg bg-muted/40 border border-border p-3 space-y-1.5">
              <p className="text-[11px] text-muted-foreground">
                These are shown automatically on this title's paywall:
              </p>
              {autoComments.map((c) => (
                <p key={c.name} className="text-[11px] text-foreground/80">
                  <span className="font-semibold">{c.name}:</span> {c.quote}
                </p>
              ))}
            </div>
          )}

          {testimonials.map((t, i) => (
            <div key={i} className="rounded-lg border border-border p-2 space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  value={t.name}
                  placeholder="Name (e.g. Layla)"
                  onChange={(e) =>
                    setTestimonials((v) => v.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
                  }
                  className="bg-muted border-border h-8 text-sm"
                  maxLength={40}
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => setTestimonials((v) => v.filter((_, j) => j !== i))}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
              <Textarea
                value={t.quote}
                placeholder="Comment shown on the paywall"
                rows={2}
                onChange={(e) =>
                  setTestimonials((v) => v.map((x, j) => (j === i ? { ...x, quote: e.target.value } : x)))
                }
                className="bg-muted border-border text-sm"
                maxLength={280}
              />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          {(isCustom || testimonials.length > 0) && (
            <Button variant="ghost" onClick={handleReset} disabled={!contentId}>
              <RotateCcw className="w-4 h-4 mr-2" /> Reset to default
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={saving || !contentId}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PaywallCustomizationsAdmin;
