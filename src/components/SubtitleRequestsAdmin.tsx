import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, MessageSquare, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SubtitleRequest {
  id: string; title_id: string; user_id: string; language: string; email: string; created_at: string; done: boolean;
}

export default function SubtitleRequestsAdmin() {
  const [rows, setRows] = useState<SubtitleRequest[]>([]);
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [count, setCount] = useState(0);
  const [messageFor, setMessageFor] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error, count: total } = await supabase.from("subtitle_requests").select("id,title_id,user_id,language,email,created_at,done", { count: "exact" }).order("done").order("created_at", { ascending: false }).order("id").range(page * 25, page * 25 + 24);
    if (error) { toast.error(error.message); setLoading(false); return; }
    const list = (data || []) as SubtitleRequest[];
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

  const remove = async (id: string) => {
    if (!window.confirm("Delete this subtitle request?")) return;
    setBusy(id);
    const { error } = await supabase.from("subtitle_requests").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Request deleted");
      setRows((v) => v.filter((r) => r.id !== id));
      setCount((c) => Math.max(0, c - 1));
    }
    setBusy(null);
  };

  const sendMessage = async (row: SubtitleRequest) => {
    if (!messageText.trim()) { toast.error("Write a message first"); return; }
    setBusy(row.id);
    const { error } = await supabase.rpc("admin_send_direct_message" as any, {
      _user_id: row.user_id,
      _body: messageText.trim(),
      _notification_title: `About your subtitle request — ${titles[row.title_id] || "title"}`,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Message sent to the user's inbox");
      setMessageFor(null);
      setMessageText("");
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
              <thead className="text-xs text-muted-foreground"><tr>{["Title", "Language", "User email", "Date", "", ""].map((label, i) => <th key={i} className="p-3 font-medium">{label}</th>)}</tr></thead>
              <tbody>{rows.map((row) => (
                <tr key={row.id} className="border-t border-border align-top">
                  <td className="p-3 text-foreground">{titles[row.title_id] || "Title unavailable"}</td>
                  <td className="p-3 text-foreground">{row.language}</td>
                  <td className="p-3 text-muted-foreground" translate="no">{row.email}</td>
                  <td className="whitespace-nowrap p-3 text-muted-foreground">{formatSpDate(row.created_at)}</td>
                  <td className="p-3">
                    <div className="flex flex-col gap-1.5">
                      <Button size="sm" variant="outline" disabled={row.done || busy !== null} onClick={() => void complete(row.id)}>{busy === row.id ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Check className="mr-1 h-4 w-4" />}Subtitled</Button>
                      <Button size="sm" variant="ghost" disabled={busy !== null} onClick={() => { setMessageFor(messageFor === row.id ? null : row.id); setMessageText(""); }}>
                        <MessageSquare className="mr-1 h-4 w-4" /> Message
                      </Button>
                    </div>
                    {messageFor === row.id && (
                      <div className="mt-2 space-y-1.5">
                        <textarea
                          value={messageText}
                          onChange={(e) => setMessageText(e.target.value)}
                          rows={2}
                          maxLength={2000}
                          placeholder="Write a message for this user's inbox…"
                          className="w-64 rounded-lg bg-card border border-border px-2.5 py-2 text-xs focus:outline-none focus:border-primary"
                        />
                        <Button size="sm" disabled={busy !== null} onClick={() => void sendMessage(row)}>
                          {busy === row.id ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}Send to inbox
                        </Button>
                      </div>
                    )}
                  </td>
                  <td className="p-3">
                    <Button size="sm" variant="ghost" disabled={busy !== null} onClick={() => void remove(row.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
        {count > 25 && <div className="flex items-center gap-3"><Button variant="outline" size="sm" disabled={page === 0 || loading} onClick={() => setPage((p) => p - 1)}>Previous</Button><span className="text-xs text-muted-foreground">Page {page + 1} of {Math.ceil(count / 25)}</span><Button variant="outline" size="sm" disabled={(page + 1) * 25 >= count || loading} onClick={() => setPage((p) => p + 1)}>Next</Button></div>}
      </TabsContent>
    </Tabs>
  );
}
