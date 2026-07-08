import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Sparkles, Save, Trash2, Plus, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Testimonial = { name: string; quote: string };
type Row = {
  id: string;
  content_id: string;
  custom_text: string | null;
  testimonials: Testimonial[];
  updated_at: string;
};
type ContentOpt = { id: string; title: string };

const emptyT = (): Testimonial[] => [
  { name: "", quote: "" },
  { name: "", quote: "" },
  { name: "", quote: "" },
];

const PaywallCustomizationsAdmin = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [contents, setContents] = useState<ContentOpt[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [contentId, setContentId] = useState<string>("");
  const [customText, setCustomText] = useState("");
  const [tList, setTList] = useState<Testimonial[]>(emptyT());
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    const [{ data: r }, { data: c }] = await Promise.all([
      (supabase as any).from("paywall_customizations").select("*").order("updated_at", { ascending: false }),
      supabase.from("contents").select("id, title").order("title"),
    ]);
    setRows(
      (r || []).map((x: any) => ({
        ...x,
        testimonials: Array.isArray(x.testimonials) ? x.testimonials : [],
      }))
    );
    setContents((c || []) as ContentOpt[]);
  };

  useEffect(() => { void load(); }, []);

  const titleFor = useMemo(() => {
    const map = new Map(contents.map((x) => [x.id, x.title]));
    return (id: string) => map.get(id) || id;
  }, [contents]);

  const resetForm = () => {
    setEditingId(null);
    setContentId("");
    setCustomText("");
    setTList(emptyT());
    setShowForm(false);
  };

  const startEdit = (row: Row) => {
    setEditingId(row.id);
    setContentId(row.content_id);
    setCustomText(row.custom_text || "");
    const arr = [...row.testimonials];
    while (arr.length < 3) arr.push({ name: "", quote: "" });
    setTList(arr.slice(0, 3));
    setShowForm(true);
  };

  const startNew = () => {
    resetForm();
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!contentId) { toast.error("Select a title"); return; }
    setSaving(true);
    try {
      const cleaned = tList
        .map((t) => ({ name: t.name.trim(), quote: t.quote.trim() }))
        .filter((t) => t.name && t.quote);
      const payload = {
        content_id: contentId,
        custom_text: customText.trim() || null,
        testimonials: cleaned,
      };
      const { error } = await (supabase as any)
        .from("paywall_customizations")
        .upsert(payload, { onConflict: "content_id" });
      if (error) throw error;
      toast.success("Saved");
      resetForm();
      await load();
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this customization?")) return;
    const { error } = await (supabase as any).from("paywall_customizations").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted");
    if (editingId === id) resetForm();
    await load();
  };

  const updateT = (i: number, field: keyof Testimonial, val: string) => {
    setTList((prev) => prev.map((t, idx) => (idx === i ? { ...t, [field]: val } : t)));
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Sparkles className="w-5 h-5 text-primary" />
          Paywall Customizations (per title)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing list */}
        <div className="space-y-2">
          {rows.length === 0 && (
            <p className="text-xs text-muted-foreground">No customizations yet. Defaults are shown on all paywalls.</p>
          )}
          {rows.map((row) => (
            <div key={row.id} className="rounded-lg border border-border bg-muted/40 px-3 py-2 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-foreground truncate">{titleFor(row.content_id)}</p>
                <p className="text-[11px] text-muted-foreground">
                  {row.testimonials.length} testimonial(s){row.custom_text ? " · custom text" : ""}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => startEdit(row)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(row.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {!showForm && (
          <Button onClick={startNew} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" /> New customization
          </Button>
        )}

        {showForm && (
          <div className="space-y-3 border-t border-border pt-4">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Title</label>
              <select
                value={contentId}
                onChange={(e) => setContentId(e.target.value)}
                disabled={!!editingId}
                className="w-full rounded-md bg-muted border border-border px-3 py-2 text-sm text-foreground"
              >
                <option value="">— Select a title —</option>
                {contents.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Custom paywall text (leave blank to use default)</label>
              <Textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                rows={4}
                className="bg-muted border-border"
                placeholder="Write a custom pitch for this title..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Testimonials (up to 3 — leave blank to use defaults)</label>
              {tList.map((t, i) => (
                <div key={i} className="rounded-lg border border-border bg-muted/40 p-2 space-y-2">
                  <Input
                    value={t.name}
                    onChange={(e) => updateT(i, "name", e.target.value)}
                    placeholder={`Reviewer #${i + 1} full name`}
                    className="bg-background border-border"
                  />
                  <Textarea
                    value={t.quote}
                    onChange={(e) => updateT(i, "quote", e.target.value)}
                    placeholder="Quote (1–2 lines)"
                    rows={2}
                    className="bg-background border-border"
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button variant="ghost" onClick={resetForm}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Save className="w-4 h-4 mr-2" />
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PaywallCustomizationsAdmin;
