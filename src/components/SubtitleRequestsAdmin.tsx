import { useCallback, useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SubtitleRequest {
  id: string; title_id: string; language: string; email: string; created_at: string; done: boolean;
}

export default function SubtitleRequestsAdmin() {
  const [rows, setRows] = useState<SubtitleRequest[]>([]);
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [count, setCount] = useState(0);
  const load = useCallback(async () => {
    setLoading(true);
    const { data, error, count: total } = await supabase.from("subtitle_requests").select("id,title_id,language,email,created_at,done", { count: "exact" }).order("done").order("created_at", { ascending: false }).order("id").range(page * 25, page * 25 + 24);
    if (error) { toast.error(error.message); setLoading(false); return; }
    const list = data || [];
    const ids = [...new Set(list.map((r) => r.title_id))];
    if (ids.length) {
      const { data: contents, error: titleError } = await supabase.from("contents").select("id,title").in("id", ids);
      if (titleError) toast.error(titleError.message);
      setTitles(Object.fromEntries((contents || []).map((c) => [c.id, c.title])));
    }
    setRows(list);
    setCount(total || 0);
    setLoading(false);
  }, [page]);
  useEffect(() => { void load(); }, [load]);
  const complete = async (id: string) => {
    setBusy(id);
    const { data, error } = await supabase.from("subtitle_requests").update({ done: true }).eq("id", id).eq("done", false).select("id");
    if (error) toast.error(error.message);
    else {
      if (data?.length) toast.success("Subtitled — inbox message sent.");
      await load();
    }
    setBusy(null);
  };
  return (
    <Tabs defaultValue="subtitle-requests">
      <TabsList><TabsTrigger value="subtitle-requests">Subtitle requests</TabsTrigger></TabsList>
      <TabsContent value="subtitle-requests" className="space-y-3">
        {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : rows.length === 0 ? <p className="text-sm text-muted-foreground">No subtitle requests yet.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted-foreground"><tr>{["Title", "Language", "User email", "Date", ""].map((label, i) => <th key={i} className="p-3 font-medium">{label}</th>)}</tr></thead>
              <tbody>{rows.map((row) => <tr key={row.id} className="border-t border-border">
                <td className="p-3 text-foreground">{titles[row.title_id] || "Title unavailable"}</td><td className="p-3 text-foreground">{row.language}</td><td className="p-3 text-muted-foreground" translate="no">{row.email}</td><td className="whitespace-nowrap p-3 text-muted-foreground">{new Date(row.created_at).toLocaleDateString("en-US")}</td>
                <td className="p-3"><Button size="sm" variant="outline" disabled={row.done || busy !== null} onClick={() => void complete(row.id)}>{busy === row.id ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Check className="mr-1 h-4 w-4" />}Subtitled</Button></td>
              </tr>)}</tbody>
            </table>
          </div>
        )}
        {count > 25 && <div className="flex items-center gap-3"><Button variant="outline" size="sm" disabled={page === 0 || loading} onClick={() => setPage((p) => p - 1)}>Previous</Button><span className="text-xs text-muted-foreground">Page {page + 1} of {Math.ceil(count / 25)}</span><Button variant="outline" size="sm" disabled={(page + 1) * 25 >= count || loading} onClick={() => setPage((p) => p + 1)}>Next</Button></div>}
      </TabsContent>
    </Tabs>
  );
}