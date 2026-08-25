import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ListChecks, Search, Trash2, Check, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TitleRequest {
  id: string;
  email: string;
  requester_name: string | null;
  title_name: string;
  genre: string | null;
  country: string | null;
  note: string | null;
  status: string;
  created_at: string;
}

const TitleRequestsAdmin = () => {
  const [rows, setRows] = useState<TitleRequest[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("title_requests")
      .select("id, email, requester_name, title_name, genre, country, note, status, created_at")
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) toast.error(error.message);
    setRows((data || []) as TitleRequest[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.title_name, r.email, r.requester_name, r.genre, r.country].some((v) =>
        String(v || "").toLowerCase().includes(q)
      )
    );
  }, [rows, query]);

  const setStatus = async (id: string, status: string) => {
    const { error } = await (supabase as any).from("title_requests").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    setRows((v) => v.map((r) => (r.id === id ? { ...r, status } : r)));
  };

  const remove = async (id: string) => {
    const { error } = await (supabase as any).from("title_requests").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setRows((v) => v.filter((r) => r.id !== id));
    toast.success("Request removed");
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <ListChecks className="w-5 h-5 text-primary" />
          Wishlist — title requests
          <span className="ml-auto text-xs font-normal text-muted-foreground">{rows.length} total</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, email or country"
            className="pl-9 bg-muted border-border"
          />
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">No requests found.</p>
        ) : (
          <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
            {filtered.map((r) => (
              <div key={r.id} className="rounded-lg border border-border bg-muted/30 p-3">
                <div className="flex items-start gap-2 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground">{r.title_name}</p>
                    <p className="text-xs text-muted-foreground break-all" translate="no">
                      {r.requester_name ? `${r.requester_name} · ` : ""}{r.email}
                    </p>
                  </div>
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                  {r.genre && <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary font-semibold">{r.genre}</span>}
                  {r.country && <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold">{r.country}</span>}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                    r.status === "added" ? "bg-green-500/15 text-green-400" : "bg-secondary/20 text-secondary"
                  }`}>{r.status}</span>
                </div>
                {r.note && <p className="mt-1.5 text-xs text-foreground/80 whitespace-pre-wrap">{r.note}</p>}
                <div className="flex items-center gap-1 mt-2">
                  {r.status !== "added" ? (
                    <Button size="sm" variant="ghost" onClick={() => setStatus(r.id, "added")}>
                      <Check className="w-3.5 h-3.5 mr-1" /> Mark as added
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => setStatus(r.id, "pending")}>
                      <RotateCcw className="w-3.5 h-3.5 mr-1" /> Back to pending
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => remove(r.id)}>
                    <Trash2 className="w-3.5 h-3.5 mr-1 text-destructive" /> Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TitleRequestsAdmin;
