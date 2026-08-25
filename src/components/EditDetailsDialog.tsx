import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Loader2, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CastMember {
  name: string;
  role?: string;
  photo_url?: string;
}

export const parseCast = (raw: unknown): CastMember[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((c: any) => c && typeof c.name === "string" && c.name.trim())
    .map((c: any) => ({
      name: String(c.name).trim(),
      role: c.role ? String(c.role).trim() : "",
      photo_url: c.photo_url ? String(c.photo_url).trim() : "",
    }));
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  content: { id: string; title: string; tag?: string | null; year?: number | null; synopsis?: string | null; cast_members?: unknown };
  onSaved?: () => void;
}

const EditDetailsDialog = ({ open, onOpenChange, content, onSaved }: Props) => {
  const [tag, setTag] = useState("");
  const [year, setYear] = useState("");
  const [synopsis, setSynopsis] = useState("");
  const [cast, setCast] = useState<CastMember[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTag(content.tag || "");
    setYear(content.year ? String(content.year) : "");
    setSynopsis(content.synopsis || "");
    setCast(parseCast(content.cast_members));
  }, [open, content.id, content.tag, content.year, content.synopsis, content.cast_members]);

  const updateMember = (i: number, patch: Partial<CastMember>) =>
    setCast((v) => v.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));

  const handleSave = async () => {
    setSaving(true);
    try {
      const cleanCast = cast
        .filter((m) => m.name.trim())
        .map((m) => ({
          name: m.name.trim().slice(0, 80),
          role: (m.role || "").trim().slice(0, 80),
          photo_url: (m.photo_url || "").trim().slice(0, 600),
        }));
      const { error } = await (supabase as any)
        .from("contents")
        .update({
          tag: tag.trim() || content.tag,
          year: year.trim() ? Number(year.trim()) : content.year,
          synopsis: synopsis.trim() || null,
          cast_members: cleanCast,
        })
        .eq("id", content.id);
      if (error) throw error;
      toast.success("Details updated");
      onSaved?.();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Could not save details");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="qs-modal max-w-lg max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">Edit details</DialogTitle>
          <DialogDescription>
            Genre, year, cast and synopsis shown in the Details tab of <span className="font-semibold">{content.title}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Genre</Label>
              <Input
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder="Romance, Drama"
                className="qs-input"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Year</Label>
              <Input
                value={year}
                onChange={(e) => setYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="2024"
                inputMode="numeric"
                className="qs-input"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Synopsis</Label>
            <Textarea
              value={synopsis}
              onChange={(e) => setSynopsis(e.target.value)}
              rows={5}
              placeholder="What is this title about?"
              className="qs-input"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Cast ({cast.length})</Label>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setCast((v) => [...v, { name: "", role: "", photo_url: "" }])}
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add actor
              </Button>
            </div>

            {cast.length === 0 && (
              <p className="text-xs text-muted-foreground">No cast yet — add actor names, roles and photos (optional).</p>
            )}

            <div className="space-y-3">
              {cast.map((m, i) => (
                <div key={i} className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    {m.photo_url ? (
                      <img src={m.photo_url} alt={m.name || "Actor"} className="w-9 h-9 rounded-full object-cover border border-border" />
                    ) : (
                      <span className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                        <UserRound className="w-4 h-4 text-muted-foreground" />
                      </span>
                    )}
                    <Input
                      value={m.name}
                      onChange={(e) => updateMember(i, { name: e.target.value })}
                      placeholder="Actor name"
                      className="qs-input"
                    />
                    <Button type="button" size="icon" variant="ghost" onClick={() => setCast((v) => v.filter((_, idx) => idx !== i))}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={m.role || ""}
                      onChange={(e) => updateMember(i, { role: e.target.value })}
                      placeholder="Character (optional)"
                      className="qs-input"
                    />
                    <Input
                      value={m.photo_url || ""}
                      onChange={(e) => updateMember(i, { photo_url: e.target.value })}
                      placeholder="Photo URL (optional)"
                      className="qs-input"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button className="flex-1 qs-btn-primary" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              Save details
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditDetailsDialog;
