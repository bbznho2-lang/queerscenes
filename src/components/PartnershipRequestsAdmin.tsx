import { useCallback, useEffect, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatSpDateTime } from "@/lib/sp-time";

interface PartnershipRequest {
  id: string;
  name: string;
  email: string;
  kind: string;
  link: string | null;
  message: string;
  status: string;
  created_at: string;
}

const KIND_LABELS: Record<string, string> = {
  creator: "Creator",
  brand: "Brand or community",
  press: "Press",
  distributor: "Distributor",
  other: "Other",
};

export default function PartnershipRequestsAdmin() {
  const [rows, setRows] = useState<PartnershipRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("partnership_requests")
      .select("id,name,email,kind,link,message,status,created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) toast.error(error.message);
    setRows((data || []) as PartnershipRequest[]);
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const setStatus = async (id: string, status: string) => {
    setBusy(id);
    const { error } = await supabase.from("partnership_requests").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else setRows((v) => v.map((r) => (r.id === id ? { ...r, status } : r)));
    setBusy(null);
  };

  const remove = async (id: string) => {
    if (!window.confirm("Delete this partnership request?")) return;
    setBusy(id);
    const { error } = await supabase.from("partnership_requests").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Request deleted");
      setRows((v) => v.filter((r) => r.id !== id));
    }
    setBusy(null);
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground">Partnership requests</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No partnership requests yet.</p>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => (
              <div key={r.id} className="rounded-xl border border-border p-4 space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-semibold text-foreground">{r.name}</span>
                  <a href={`mailto:${r.email}?subject=Partnership`} className="text-primary underline">{r.email}</a>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{KIND_LABELS[r.kind] || r.kind}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{formatSpDateTime(r.created_at)}</span>
                </div>
                {r.link && (
                  <a href={r.link} target="_blank" rel="noopener noreferrer" className="block text-xs text-primary underline break-all">{r.link}</a>
                )}
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{r.message}</p>
                <div className="flex items-center gap-2">
                  <select
                    value={r.status}
                    disabled={busy === r.id}
                    onChange={(e) => void setStatus(r.id, e.target.value)}
                    className="bg-muted border border-border rounded-lg px-2 py-1 text-xs text-foreground"
                  >
                    <option value="new">New</option>
                    <option value="replied">Replied</option>
                    <option value="archived">Archived</option>
                  </select>
                  <Button variant="ghost" size="icon" disabled={busy === r.id} onClick={() => void remove(r.id)} title="Delete">
                    {busy === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 text-destructive" />}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
