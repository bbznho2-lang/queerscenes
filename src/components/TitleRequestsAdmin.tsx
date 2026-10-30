import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ListChecks, Loader2, MessageSquare, Search, Trash2, Check, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatSpDate } from "@/lib/sp-time";

interface TitleRequest {
  id: string;
  user_id: string | null;
  email: string;
  requester_name: string | null;
  title_name: string;
  genre: string | null;
  country: string | null;
  note: string | null;
  status: string;
  admin_reply: string | null;
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
      .select("id, user_id, email, requester_name, title_name, genre, country, note, status, admin_reply, created_at")
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

  const [replyFor, setReplyFor] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const setStatus = async (id: string, status: string) => {
    const { error } = await (supabase as any).from("title_requests").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    setRows((v) => v.map((r) => (r.id === id ? { ...r, status } : r)));
    if (status === "added") {
      const req = rows.find((r) => r.id === id);
      if (req?.email) {
        // Notify the requester by email; the inbox message is sent automatically.
        void supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "title-added",
            recipientEmail: req.email,
            idempotencyKey: `title-added-${id}`,
            templateData: {
              titleName: req.title_name,
              titleUrl: `${window.location.origin}/browse`,
            },
          },
        }).then(({ error: mailError }) => {
          if (mailError) toast.error("Email could not be sent: " + mailError.message);
          else toast.success("Requester notified by email and inbox");
        });
      }
    }
  };

  const saveReply = async (id: string) => {
    setBusy(id);
    const { error } = await (supabase as any).from("title_requests").update({ admin_reply: replyText.trim() || null }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      setRows((v) => v.map((r) => (r.id === id ? { ...r, admin_reply: replyText.trim() || null } : r)));
      setReplyFor(null);
      toast.success("Public reply saved — it now shows on the wishlist page");
    }
    setBusy(null);
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
                    {formatSpDate(r.created_at)}
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
                {r.admin_reply && (
                  <p className="mt-1.5 text-xs rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-foreground">
                    <span className="font-semibold text-primary">Queer Scenes:</span> {r.admin_reply}
                  </p>
                )}
                <div className="flex items-center gap-1 mt-2 flex-wrap">
                  {r.status !== "added" ? (
                    <Button size="sm" variant="ghost" onClick={() => setStatus(r.id, "added")}>
                      <Check className="w-3.5 h-3.5 mr-1" /> Mark as added
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => setStatus(r.id, "pending")}>
                      <RotateCcw className="w-3.5 h-3.5 mr-1" /> Back to pending
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" disabled={busy !== null} onClick={() => { setReplyFor(replyFor === r.id ? null : r.id); setReplyText(r.admin_reply || ""); }}>
                    <MessageSquare className="w-3.5 h-3.5 mr-1" /> Public reply
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(r.id)}>
                    <Trash2 className="w-3.5 h-3.5 mr-1 text-destructive" /> Delete
                  </Button>
                </div>
                {replyFor === r.id && (
                  <div className="mt-2 space-y-1.5">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      rows={2}
                      maxLength={500}
                      placeholder="e.g. It's available now — enjoy! 💜"
                      className="w-full rounded-lg bg-card border border-border px-2.5 py-2 text-xs focus:outline-none focus:border-primary"
                    />
                    <Button size="sm" disabled={busy !== null} onClick={() => void saveReply(r.id)}>
                      {busy === r.id ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : null}Save reply
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TitleRequestsAdmin;
