import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Sparkles, Save, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const DEFAULT_PAYWALL_TEXT = "Subtitles: 🇬🇧";

type ContentOpt = { id: string; title: string };

const PaywallCustomizationsAdmin = () => {
  const [contents, setContents] = useState<ContentOpt[]>([]);
  const [customMap, setCustomMap] = useState<Record<string, string>>({});
  const [contentId, setContentId] = useState<string>("");
  const [text, setText] = useState(DEFAULT_PAYWALL_TEXT);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [{ data: c }, { data: r }] = await Promise.all([
      supabase.from("contents").select("id, title").order("title"),
      (supabase as any).from("paywall_customizations").select("content_id, custom_text"),
    ]);
    setContents((c || []) as ContentOpt[]);
    const map: Record<string, string> = {};
    (r || []).forEach((x: any) => { if (x.custom_text) map[x.content_id] = x.custom_text; });
    setCustomMap(map);
  };

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    if (!contentId) { setText(DEFAULT_PAYWALL_TEXT); return; }
    setText(customMap[contentId] || DEFAULT_PAYWALL_TEXT);
  }, [contentId, customMap]);

  const isCustom = useMemo(
    () => contentId && customMap[contentId] && customMap[contentId] !== DEFAULT_PAYWALL_TEXT,
    [contentId, customMap]
  );

  const handleSave = async () => {
    if (!contentId) { toast.error("Select a title"); return; }
    setSaving(true);
    try {
      const trimmed = text.trim();
      const payload = {
        content_id: contentId,
        custom_text: trimmed && trimmed !== DEFAULT_PAYWALL_TEXT ? trimmed : null,
        testimonials: [],
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
          Paywall Text (per title)
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
                {c.title}{customMap[c.id] ? "  ✎" : ""}
              </option>
            ))}
          </select>
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
            rows={7}
            disabled={!contentId}
            className="bg-muted border-border"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          {isCustom && (
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
