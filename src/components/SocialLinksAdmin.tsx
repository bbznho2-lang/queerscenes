import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Share2, Plus, Trash2, Save, ArrowUp, ArrowDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SOCIAL_ICON_OPTIONS } from "@/lib/social-icons";

type Row = {
  id: string;
  label: string;
  href: string;
  icon: string;
  position: number;
  is_active: boolean;
};

const SocialLinksAdmin = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await (supabase as any)
      .from("social_links")
      .select("*")
      .order("position", { ascending: true });
    setRows((data || []) as Row[]);
  };

  useEffect(() => { void load(); }, []);

  const patch = (id: string, p: Partial<Row>) =>
    setRows((r) => r.map((x) => (x.id === id ? { ...x, ...p } : x)));

  const move = (id: string, dir: -1 | 1) => {
    setRows((r) => {
      const i = r.findIndex((x) => x.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= r.length) return r;
      const copy = [...r];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy.map((x, idx) => ({ ...x, position: idx + 1 }));
    });
  };

  const addRow = async () => {
    const { data, error } = await (supabase as any)
      .from("social_links")
      .insert({ label: "New network", href: "https://", icon: "link", position: rows.length + 1 })
      .select()
      .single();
    if (error) { toast.error(error.message); return; }
    setRows((r) => [...r, data as Row]);
  };

  const remove = async (id: string) => {
    const { error } = await (supabase as any).from("social_links").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setRows((r) => r.filter((x) => x.id !== id));
    toast.success("Removed");
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      for (const [idx, r] of rows.entries()) {
        const href = r.href.trim();
        if (href && !/^https?:\/\//i.test(href)) {
          toast.error(`${r.label}: link must start with https://`);
          setSaving(false);
          return;
        }
        const { error } = await (supabase as any)
          .from("social_links")
          .update({ label: r.label.trim(), href, icon: r.icon, is_active: r.is_active, position: idx + 1 })
          .eq("id", r.id);
        if (error) throw error;
      }
      toast.success("Social links saved");
      await load();
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Share2 className="w-5 h-5 text-primary" />
          Social Media (sidebar menu)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length === 0 && (
          <p className="text-sm text-muted-foreground">No social links yet.</p>
        )}
        {rows.map((r, idx) => (
          <div key={r.id} className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                value={r.label}
                onChange={(e) => patch(r.id, { label: e.target.value })}
                placeholder="Name (Instagram)"
                className="bg-muted border-border sm:max-w-[180px]"
              />
              <Input
                value={r.href}
                onChange={(e) => patch(r.id, { href: e.target.value })}
                placeholder="https://..."
                className="bg-muted border-border flex-1"
              />
              <select
                value={r.icon}
                onChange={(e) => patch(r.id, { icon: e.target.value })}
                className="rounded-md bg-muted border border-border px-3 py-2 text-sm text-foreground sm:max-w-[150px]"
              >
                {SOCIAL_ICON_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch checked={r.is_active} onCheckedChange={(v) => patch(r.id, { is_active: v })} />
                <span className="text-xs text-muted-foreground">{r.is_active ? "Visible" : "Hidden"}</span>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => move(r.id, -1)} disabled={idx === 0}>
                  <ArrowUp className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => move(r.id, 1)} disabled={idx === rows.length - 1}>
                  <ArrowDown className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => remove(r.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          </div>
        ))}

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <Button variant="outline" onClick={addRow}>
            <Plus className="w-4 h-4 mr-2" /> Add network
          </Button>
          <Button onClick={saveAll} disabled={saving} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SocialLinksAdmin;
