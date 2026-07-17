import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CircleOff, Plus, Trash2, ChevronLeft, ChevronRight, Pencil } from "lucide-react";

interface CanceledRow {
  id: string;
  email: string;
  name: string | null;
  plan: string | null;
  previous_expires_at: string | null;
  canceled_at: string;
  notes: string | null;
}

const PAGE_SIZE = 10;

export default function CanceledSubscriptionsSection() {
  const [rows, setRows] = useState<CanceledRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  // Form state
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [plan, setPlan] = useState<string>("monthly");
  const [canceledDate, setCanceledDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [cancelAccess, setCancelAccess] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("canceled_subscriptions")
      .select("*")
      .order("canceled_at", { ascending: false });
    if (error) {
      toast.error("Failed to load canceled subscriptions");
    } else {
      setRows((data as CanceledRow[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    const emailTrimmed = email.trim().toLowerCase();
    if (!emailTrimmed) { toast.error("Email is required"); return; }
    setSubmitting(true);
    try {
      let prevExpires: string | null = null;
      let resolvedName = name.trim() || null;
      const { data: prof } = await (supabase as any)
        .from("profiles")
        .select("first_name,last_name,premium_expires_at,premium_plan")
        .ilike("email", emailTrimmed)
        .maybeSingle();
      if (prof) {
        prevExpires = prof.premium_expires_at || null;
        if (!resolvedName) {
          const composed = [prof.first_name, prof.last_name].filter(Boolean).join(" ").trim();
          resolvedName = composed || null;
        }
      }

      const { error: insErr } = await (supabase as any)
        .from("canceled_subscriptions")
        .insert({
          email: emailTrimmed,
          name: resolvedName,
          plan: plan || null,
          previous_expires_at: prevExpires,
          canceled_at: new Date(canceledDate + "T12:00:00Z").toISOString(),
          notes: notes.trim() || null,
        });
      if (insErr) throw insErr;

      if (cancelAccess) {
        await (supabase as any)
          .from("profiles")
          .update({ is_premium: false, premium_plan: null, premium_expires_at: null })
          .ilike("email", emailTrimmed);
        await (supabase as any)
          .from("pending_supporters")
          .update({ status: "canceled", premium_expires_at: new Date(Date.now() - 1000).toISOString() })
          .ilike("email", emailTrimmed)
          .gt("premium_expires_at", new Date().toISOString());
      }

      toast.success("Cancellation logged");
      setEmail(""); setName(""); setNotes("");
      setCanceledDate(new Date().toISOString().split("T")[0]);
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Failed to add cancellation");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this entry from the canceled list?")) return;
    const { error } = await (supabase as any)
      .from("canceled_subscriptions").delete().eq("id", id);
    if (error) toast.error("Failed to delete");
    else { toast.success("Entry removed"); load(); }
  };

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState("");

  const startEdit = (r: CanceledRow) => {
    setEditingId(r.id);
    setEditingNotes(r.notes || "");
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const { error } = await (supabase as any)
      .from("canceled_subscriptions")
      .update({ notes: editingNotes.trim() || null })
      .eq("id", editingId);
    if (error) { toast.error("Failed to update"); return; }
    toast.success("Reason updated");
    setEditingId(null);
    setEditingNotes("");
    load();
  };

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <CircleOff className="w-5 h-5 text-destructive" />
          Canceled Subscriptions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add form */}
        <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Email</label>
              <Input type="email" placeholder="user@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-background" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Name (optional)</label>
              <Input placeholder="Auto-filled if user exists" value={name} onChange={(e) => setName(e.target.value)} className="bg-background" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Plan</label>
              <Select value={plan} onValueChange={setPlan}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                  <SelectItem value="lifetime">Lifetime</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Canceled on</label>
              <Input type="date" value={canceledDate} onChange={(e) => setCanceledDate(e.target.value)} className="bg-background" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Notes (optional)</label>
            <Input placeholder="Reason, refund, etc." value={notes} onChange={(e) => setNotes(e.target.value)} className="bg-background" />
          </div>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <label className="flex items-center gap-2 text-xs text-muted-foreground select-none">
              <input type="checkbox" checked={cancelAccess} onChange={(e) => setCancelAccess(e.target.checked)} />
              Also revoke supporter access for this email
            </label>
            <Button onClick={handleAdd} disabled={submitting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              <Plus className="w-4 h-4 mr-1" />
              {submitting ? "Saving..." : "Log cancellation"}
            </Button>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <p className="text-muted-foreground text-center py-6 text-sm">Loading...</p>
        ) : rows.length > 0 ? (
          <div className="space-y-1">
            <div className="hidden sm:grid grid-cols-[1.5fr_1fr_100px_120px_80px] gap-3 px-3 py-2 text-xs text-muted-foreground font-medium border-b border-border">
              <span>Email</span>
              <span>Name</span>
              <span>Plan</span>
              <span className="text-right">Canceled on</span>
              <span />
            </div>
            {pageRows.map((r) => (
              <div key={r.id} className="grid grid-cols-1 sm:grid-cols-[1.5fr_1fr_100px_120px_80px] gap-1 sm:gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/30 transition-colors border-b border-border/30 last:border-0 items-center">
                <span className="text-sm text-foreground truncate" title={r.email}>{r.email}</span>
                <span className="text-sm text-muted-foreground truncate">{r.name || "—"}</span>
                <span className="text-xs capitalize text-muted-foreground">{r.plan || "—"}</span>
                <span className="text-xs text-muted-foreground sm:text-right">
                  {new Date(r.canceled_at).toLocaleDateString(undefined, { day: "2-digit", month: "2-digit", year: "numeric" })}
                </span>
                <div className="sm:justify-self-end flex items-center gap-1">
                  <Button size="icon" variant="ghost" onClick={() => startEdit(r)} className="h-8 w-8 text-muted-foreground hover:text-foreground" title="Edit reason">
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => handleDelete(r.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                {editingId === r.id ? (
                  <div className="col-span-full flex items-center gap-2 pt-1">
                    <Input
                      autoFocus
                      value={editingNotes}
                      onChange={(e) => setEditingNotes(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditingId(null); }}
                      placeholder="Cancellation reason"
                      className="bg-background h-8 text-xs"
                    />
                    <Button size="sm" onClick={saveEdit} className="h-8">Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-8">Cancel</Button>
                  </div>
                ) : r.notes ? (
                  <span className="col-span-full text-xs text-muted-foreground italic pl-0 sm:pl-1">
                    {r.notes}
                  </span>
                ) : null}
              </div>
            ))}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-border mt-2">
                <span className="text-xs text-muted-foreground">Page {page} of {totalPages} ({rows.length} entries)</span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-6 text-sm">No canceled subscriptions logged yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
