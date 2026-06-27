import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type EventRow = { event_type: string; created_at: string; user_id: string | null };
type PendingRow = { created_at: string; status: string };

const RANGES = [
  { key: "7", label: "7d" },
  { key: "30", label: "30d" },
  { key: "90", label: "90d" },
  { key: "all", label: "All" },
] as const;

type RangeKey = (typeof RANGES)[number]["key"];

const ConversionFunnel = () => {
  const [range, setRange] = useState<RangeKey>("30");
  const [events, setEvents] = useState<EventRow[]>([]);
  const [pending, setPending] = useState<PendingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [liveStatus, setLiveStatus] = useState<"connecting" | "live" | "polling">("connecting");

  useEffect(() => {
    let active = true;
    const load = async (showLoading = true) => {
      if (showLoading) setLoading(true);
      const sinceIso = range === "all"
        ? null
        : new Date(Date.now() - parseInt(range, 10) * 86400000).toISOString();

      let evQ = supabase
        .from("supporter_events")
        .select("event_type, created_at, user_id")
        .order("created_at", { ascending: false })
        .limit(20000);
      if (sinceIso) evQ = evQ.gte("created_at", sinceIso);

      let pendQ = supabase
        .from("pending_supporters")
        .select("created_at, status")
        .limit(5000);
      if (sinceIso) pendQ = pendQ.gte("created_at", sinceIso);

      const [{ data: ev }, { data: pd }] = await Promise.all([evQ, pendQ]);
      if (!active) return;
      setEvents((ev as EventRow[]) ?? []);
      setPending((pd as PendingRow[]) ?? []);
      setLoading(false);
    };
    void load(true);

    const channel = supabase
      .channel("conversion-funnel")
      .on("postgres_changes", { event: "*", schema: "public", table: "supporter_events" }, () => {
        void load(false);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "pending_supporters" }, () => {
        void load(false);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setLiveStatus("live");
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") setLiveStatus("polling");
      });

    const poll = window.setInterval(() => {
      if (active) void load(false);
    }, 15000);

    return () => {
      active = false;
      supabase.removeChannel(channel);
      window.clearInterval(poll);
    };
  }, [range]);

  const steps = useMemo(() => {
    const count = (t: string) => events.filter((e) => e.event_type === t).length;
    const lockedView = count("locked_content_view") + count("paywall_view");
    const becomeClick = count("become_supporter_click");
    const signupClick = count("paywall_signup_click");
    const signupSubmit = count("paywall_signup_submit");
    const checkouts = pending.filter((p) => p.status === "paid" || p.status === "claimed").length;

    const base = [
      { key: "view", label: "Saw paywall / locked content", value: lockedView, color: "#ec4899" },
      { key: "become", label: "Clicked “Become a Supporter”", value: becomeClick, color: "#a855f7" },
      { key: "signup_click", label: "Started signup form", value: signupClick, color: "#6366f1" },
      { key: "signup_submit", label: "Submitted signup", value: signupSubmit, color: "#2dd4bf" },
      { key: "paid", label: "Completed checkout (paid)", value: checkouts, color: "#f59e0b" },
    ];
    const top = Math.max(1, base[0].value);
    return base.map((s, i) => {
      const prev = i === 0 ? s.value : base[i - 1].value;
      const dropRate = i === 0 || prev === 0 ? 0 : 1 - s.value / prev;
      return {
        ...s,
        pctOfTop: (s.value / top) * 100,
        dropRate,
        conversionFromPrev: prev === 0 ? 0 : s.value / prev,
      };
    });
  }, [events, pending]);

  const overall = steps.length > 1 && steps[0].value > 0 ? steps[steps.length - 1].value / steps[0].value : 0;

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-foreground">
          <span className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5" style={{ color: "#f59e0b" }} />
            Conversion funnel
            <span
              className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
              style={{
                background: liveStatus === "live" ? "rgba(45,212,191,0.15)" : "rgba(245,158,11,0.15)",
                color: liveStatus === "live" ? "#2dd4bf" : "#f59e0b",
              }}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${liveStatus === "live" ? "animate-pulse" : ""}`}
                style={{ background: liveStatus === "live" ? "#2dd4bf" : "#f59e0b" }}
              />
              {liveStatus === "live" ? "Live" : liveStatus === "connecting" ? "Connecting" : "Polling"}
            </span>
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-normal text-muted-foreground">
              Overall: <span className="font-semibold" style={{ color: "#2dd4bf" }}>{(overall * 100).toFixed(2)}%</span>
            </span>
            <div className="flex rounded-md border border-border overflow-hidden">
              {RANGES.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setRange(r.key)}
                  className={`px-2.5 py-1 text-xs transition-colors ${
                    range === r.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : (
          <div className="space-y-3">
            {steps.map((s, i) => (
              <div key={s.key} className="space-y-1">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-foreground font-medium">
                    <span className="text-muted-foreground mr-2 tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                    {s.label}
                  </span>
                  <span className="flex items-center gap-2 tabular-nums">
                    <span className="font-semibold text-foreground">{s.value.toLocaleString()}</span>
                    {i > 0 && (
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded"
                        style={{
                          background: s.dropRate > 0.5 ? "rgba(239,68,68,0.15)" : "rgba(45,212,191,0.15)",
                          color: s.dropRate > 0.5 ? "#f87171" : "#2dd4bf",
                        }}
                      >
                        {(s.conversionFromPrev * 100).toFixed(1)}% from prev
                      </span>
                    )}
                  </span>
                </div>
                <div className="h-6 rounded-md bg-muted/40 overflow-hidden">
                  <div
                    className="h-full rounded-md transition-all"
                    style={{
                      width: `${Math.max(s.pctOfTop, s.value > 0 ? 2 : 0)}%`,
                      background: `linear-gradient(90deg, ${s.color}, ${s.color}aa)`,
                    }}
                  />
                </div>
              </div>
            ))}
            <p className="text-[11px] text-muted-foreground pt-2 leading-relaxed">
              Big drops between two steps reveal where leads abandon. A low % between "Submitted signup" and "Completed checkout" usually means Stripe friction (card declined, price shock, abandoned tab).
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ConversionFunnel;
