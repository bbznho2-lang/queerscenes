import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Search, Plus, Check } from "lucide-react";
import { toast } from "sonner";

interface ContentItem {
  id: string;
  title: string;
  year: number;
  tag: string;
  type: string;
  banner_url: string | null;
  section: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  targetSection: string;
  onSaved: () => void;
}

const AddExistingContentDialog = ({ open, onOpenChange, targetSection, onSaved }: Props) => {
  const [search, setSearch] = useState("");
  const [allContent, setAllContent] = useState<ContentItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setSearch("");
      setSelected(new Set());
      fetchContent();
    }
  }, [open]);

  const fetchContent = async () => {
    // Get titles already in target section to exclude duplicates by title
    const { data: existing } = await supabase
      .from("contents")
      .select("title")
      .eq("section", targetSection);
    const existingTitles = new Set((existing || []).map((e) => e.title.toLowerCase()));

    const { data } = await supabase
      .from("contents")
      .select("id, title, year, tag, type, banner_url, section")
      .neq("section", targetSection)
      .order("title");
    // Filter out titles that already exist in target section
    setAllContent((data || []).filter((c) => !existingTitles.has(c.title.toLowerCase())));
  };

  const filtered = search.trim()
    ? allContent.filter((c) => c.title.toLowerCase().includes(search.toLowerCase()))
    : allContent;

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdd = async () => {
    if (selected.size === 0) return;
    setSaving(true);
    try {
      // Get full data (incl. player_url) via admin RPC to duplicate items
      const { data: items, error: fetchErr } = await supabase
        .rpc("admin_get_contents", { _ids: Array.from(selected) });
      if (fetchErr) throw fetchErr;

      for (const item of (items as any[]) || []) {
        const { id: originalId, ...rest } = item;
        const { data: inserted, error } = await supabase
          .from("contents")
          .insert({ ...rest, section: targetSection })
          .select("id")
          .single();
        if (error) throw error;

        // Duplicate episodes for series/soap operas so the player works
        const { data: eps } = await (supabase.rpc as any)("admin_get_episodes", { _content_id: originalId });
        if (Array.isArray(eps) && eps.length > 0 && inserted?.id) {
          const rows = eps.map((ep: any) => {
            const { id: _epId, content_id: _cid, created_at: _c, ...epRest } = ep;
            return { ...epRest, content_id: inserted.id };
          });
          const { error: epErr } = await supabase.from("episodes").insert(rows);
          if (epErr) throw epErr;
        }
      }
      toast.success(`${selected.size} título(s) adicionado(s) aos Exclusivos!`);
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao adicionar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="neon-text-purple">Adicionar Títulos Existentes</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar título..."
            className="bg-muted border-border pl-9"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 min-h-0 max-h-[50vh] pr-1">
          {filtered.length === 0 ? (
            <p className="text-muted-foreground text-center py-8 text-sm">Nenhum título encontrado</p>
          ) : (
            filtered.map((item) => (
              <button
                key={item.id}
                onClick={() => toggleSelect(item.id)}
                className={`w-full flex items-center gap-3 p-2.5 rounded-lg transition-colors text-left ${
                  selected.has(item.id)
                    ? "bg-primary/20 border border-primary/40"
                    : "bg-muted/30 hover:bg-muted/60 border border-transparent"
                }`}
              >
                <img
                  src={item.banner_url || "/placeholder.svg"}
                  alt={item.title}
                  className="w-10 h-14 rounded object-cover bg-muted flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.year} · {item.tag} · {item.section}
                  </p>
                </div>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                  selected.has(item.id) ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}>
                  {selected.has(item.id) ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 text-muted-foreground" />}
                </div>
              </button>
            ))
          )}
        </div>

        <Button
          onClick={handleAdd}
          disabled={saving || selected.size === 0}
          className="w-full bg-primary text-primary-foreground rounded-full glow-purple gap-2"
        >
          {saving ? "Adicionando..." : `Adicionar ${selected.size > 0 ? `(${selected.size})` : ""}`}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default AddExistingContentDialog;
