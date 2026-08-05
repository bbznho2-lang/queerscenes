import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { buildReferralUrl, maskEmail, normalizeRefCode } from "@/lib/referral";
import { Copy, Link2, RefreshCw, TrendingUp } from "lucide-react";
import { toast } from "sonner";

type RangeKey = "7" | "30" | "all";

interface ReferralEvent {
  id: string;
  ref_code: string;
  event_type: "click" | "payment";
  email: string | null;
  amount_cents: number | null;
  currency: string | null;
  created_at: string;
}

const ReferralsSection = () => {
  const [range, setRange] = useState<RangeKey>("30");
  const [events, setEvents] = useState<ReferralEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [newInfluencer, setNewInfluencer] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    let query = (supabase as any)
      .from("referral_events")
      .select("id, ref_code, event_type, email, amount_cents, currency, created_at")
      .order("created_at", { ascending: false })
      .limit(5000);

    if (range !== "all") {
      const since = new Date(Date.now() - Number(range) * 864e5).toISOString();
      query = query.gte("created_at", since);
    }
    const { data } = await query;
    setEvents((data || []) as ReferralEvent[]);
    setLoading(false);
  }, [range]);

  useEffect(() => {
    void load();
    const channel = supabase
      .channel("referral-events-admin")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "referral_events" }, () => void load())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [load]);

  const influencers = useMemo(() => {
    const codes = new Set<string>(["artie"]);
    events.forEach((e) => codes.add(e.ref_code));
    return Array.from(codes).sort();
  }, [events]);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Referral link copied");
    } catch {
      toast.error("Could not copy link");
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card/60 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h3 className="text-lg font-black flex items-center gap-2 text-foreground">
          <TrendingUp className="w-5 h-5 text-primary" /> Referrals
        </h3>
        <div className="flex items-center gap-2">
          {(["7", "30", "all"] as RangeKey[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`h-8 px-3 rounded-full text-xs font-semibold transition-colors ${
                range === r ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              {r === "all" ? "All time" : `Last ${r} days`}
            </button>
          ))}
          <button
            onClick={() => void load()}
            className="h-8 w-8 rounded-full bg-muted hover:bg-muted/70 flex items-center justify-center"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Link generator */}
      <div className="mb-6 rounded-xl border border-border bg-background/50 p-3 sm:p-4">
        <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
          <Link2 className="w-3.5 h-3.5" /> Generate referral link
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={newInfluencer}
            onChange={(e) => setNewInfluencer(e.target.value)}
            placeholder="influencer name (e.g. artie)"
            className="flex-1 min-w-[180px] h-9 px-3 rounded-lg bg-muted text-sm text-foreground outline-none"
          />
          <button
            onClick={() => {
              const code = normalizeRefCode(newInfluencer);
              if (!code) return toast.error("Type a valid influencer name");
              void copy(buildReferralUrl(code));
            }}
            className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold"
          >
            Generate & copy
          </button>
        </div>
        {normalizeRefCode(newInfluencer) && (
          <p className="mt-2 text-xs text-muted-foreground break-all">
            {buildReferralUrl(normalizeRefCode(newInfluencer)!)}
          </p>
        )}
      </div>

      <div className="space-y-5">
        {influencers.map((code) => {
          const own = events.filter((e) => e.ref_code === code);
          const clicks = own.filter((e) => e.event_type === "click").length;
          const payments = own.filter((e) => e.event_type === "payment");
          const revenue = payments.reduce((sum, p) => sum + (p.amount_cents || 0), 0) / 100;
          const rate = clicks > 0 ? (payments.length / clicks) * 100 : 0;
          const link = buildReferralUrl(code);

          return (
            <div key={code} className="rounded-xl border border-border bg-background/50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <p className="text-sm font-black text-foreground">@{code}</p>
                <button
                  onClick={() => void copy(link)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground break-all"
                >
                  <Copy className="w-3.5 h-3.5 flex-shrink-0" /> {link}
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {[
                  { label: "Clicks", value: String(clicks) },
                  { label: "Payments", value: String(payments.length) },
                  { label: "Revenue", value: `€${revenue.toFixed(2)}` },
                  { label: "Conversion", value: `${rate.toFixed(1)}%` },
                ].map((m) => (
                  <div key={m.label} className="rounded-lg bg-muted/60 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{m.label}</p>
                    <p className="text-lg font-black text-foreground">{m.value}</p>
                  </div>
                ))}
              </div>

              <p className="text-xs font-semibold text-muted-foreground mb-2">Payments</p>
              {payments.length === 0 ? (
                <p className="text-xs text-muted-foreground">No payments in this period.</p>
              ) : (
                <div className="space-y-1.5">
                  {payments.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between gap-3 text-xs rounded-lg bg-muted/40 px-3 py-2"
                    >
                      <span className="text-muted-foreground">
                        {new Date(p.created_at).toLocaleDateString()}
                      </span>
                      <span className="text-foreground truncate">{maskEmail(p.email)}</span>
                      <span className="font-semibold text-foreground">
                        €{((p.amount_cents || 0) / 100).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ReferralsSection;
