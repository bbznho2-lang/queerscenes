import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Megaphone, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PRESET_COLORS = [
  "#7c3aed", // purple
  "#ec4899", // pink
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#06b6d4", // cyan
  "#a855f7", // violet
];

const SiteNoteAdmin = () => {
  const [id, setId] = useState<string | null>(null);
  const [title, setTitle] = useState("Announcement");
  const [body, setBody] = useState("");
  const [color, setColor] = useState("#7c3aed");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("site_notes")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        setId(data.id);
        setTitle(data.title);
        setBody(data.body);
        setColor(data.color);
        setIsActive(data.is_active);
      }
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (id) {
        const { error } = await (supabase as any)
          .from("site_notes")
          .update({ title, body, color, is_active: isActive })
          .eq("id", id);
        if (error) throw error;
      } else {
        const { data, error } = await (supabase as any)
          .from("site_notes")
          .insert({ title, body, color, is_active: isActive })
          .select()
          .single();
        if (error) throw error;
        setId(data.id);
      }
      toast.success("Note saved");
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
          <Megaphone className="w-5 h-5 text-primary" />
          Site Note (above Top 10)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Title (e.g. Notice, Update, Announcement)</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} className="bg-muted border-border" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Message (emojis supported 🎉)</label>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            className="bg-muted border-border"
            placeholder="Write your message here..."
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Background color</label>
          <div className="flex items-center gap-2 flex-wrap">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-8 h-8 rounded-full border-2 transition-all ${color === c ? "border-foreground scale-110" : "border-transparent"}`}
                style={{ backgroundColor: c }}
              />
            ))}
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-10 h-10 rounded cursor-pointer bg-transparent"
            />
            <span className="text-xs text-muted-foreground font-mono">{color}</span>
          </div>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-3">
            <Switch checked={isActive} onCheckedChange={setIsActive} />
            <span className="text-sm text-foreground">Show on site</span>
          </div>
          <Button onClick={handleSave} disabled={saving} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>

        {/* Preview */}
        <div className="pt-2">
          <p className="text-xs text-muted-foreground mb-2">Preview</p>
          <div
            className="rounded-2xl border p-4"
            style={{ backgroundColor: `${color}1a`, borderColor: `${color}66` }}
          >
            <div className="flex items-start gap-3">
              <div
                className="mt-0.5 w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: color, boxShadow: `0 0 12px ${color}` }}
              />
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-foreground mb-1">{title || "Title"}</h3>
                <p className="text-xs text-foreground/80 whitespace-pre-wrap leading-relaxed">
                  {body || "Your message will appear here..."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SiteNoteAdmin;
