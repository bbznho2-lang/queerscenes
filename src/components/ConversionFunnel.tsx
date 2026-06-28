import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type EventRow = {
  id?: string;
  event_type: string;
  created_at: string;
  user_id: string | null;
  metadata: Record<string, unknown> | null;
};
type PendingRow = {
  id?: string;
  created_at: string;
  updated_at: string | null;
  claimed_at: string | null;
  status: string;
  email: string | null;
};

type FunnelStep = {
  key: string;
  label: string;
  value: number;
  identities: Set<string>;
  color: string;
};

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
        .select("id, event_type, created_at, user_id, metadata")
        .order("created_at", { ascending: false })
        .limit(20000);
      if (sinceIso) evQ = evQ.gte("created_at", sinceIso);

      let pendQ = supabase
        .from("pending_supporters")
        .select("id, created_at, updated_at, claimed_at, status, email")
        .limit(5000);

      // Payment rows are often created before payment is completed and only get
      // updated/claimed later, so fetch paid records first and apply the active
      // date range with the real completion timestamp below.
      pendQ = pendQ.in("status", ["paid", "claimed"]);

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

  const { steps, paidTotalStripe, paidUnlinked } = useMemo(() => {
    const sinceTime = range === "all" ? null : Date.now() - parseInt(range, 10) * 86400000;
    const inActiveRange = (value?: string | null) => {
      if (!sinceTime) return true;
      if (!value) return false;
      const time = new Date(value).getTime();
      return Number.isFinite(time) && time >= sinceTime;
    };
    const completionDateForPayment = (payment: PendingRow) => payment.claimed_at || payment.updated_at || payment.created_at;
    const paidInRange = pending.filter((p) => (p.status === "paid" || p.status === "claimed") && inActiveRange(completionDateForPayment(p)));
    const identityFor = (event: EventRow) => {
      const visitorId = typeof event.metadata?.visitor_id === "string" ? event.metadata.visitor_id : null;
      const email = typeof event.metadata?.email === "string" ? event.metadata.email.toLowerCase() : null;
      // Prefer stable user_id, then visitor_id. For old anonymous rows with no identity,
      // count the row once so old signup/click data does not incorrectly show as zero.
      return event.user_id || visitorId || email || `legacy:${event.id ?? event.event_type + event.created_at}`;
    };
    const identitiesForEvents = (...types: string[]) => {
      const wanted = new Set(types);
      return new Set(events.filter((e) => wanted.has(e.event_type)).map(identityFor));
    };

    const identitiesForPayments = () => new Set(
      paidInRange
        .map((p) => p.email?.trim().toLowerCase() || `legacy-payment:${p.id ?? p.created_at}`),
    );

    const union = (...sets: Set<string>[]) => {
      const result = new Set<string>();
      sets.forEach((set) => set.forEach((value) => result.add(value)));
      return result;
    };

    const lockedViewIds = identitiesForEvents("locked_content_view", "paywall_view");
    const becomeClickIds = identitiesForEvents("become_supporter_click");
    const signupClickIds = identitiesForEvents("paywall_signup_click");
    const signupSubmitIds = identitiesForEvents("paywall_signup_submit");
    const redirectedIds = identitiesForEvents("checkout_session_created");
    const completedLinkedIds = identitiesForEvents("checkout_completed");
    const totalStripeIds = identitiesForPayments();

    const paidIds = union(completedLinkedIds, totalStripeIds);

    // Show each funnel step as a cumulative audience. A later backend event should never
    // make the visible count look like it went down; it means that user reached that step
    // and therefore also belongs to the earlier intent steps.
    const submittedIds = union(signupSubmitIds, redirectedIds, paidIds);
    const startedSignupIds = union(signupClickIds, submittedIds);
    const becameSupporterIds = union(becomeClickIds, startedSignupIds);
    const viewedIds = union(lockedViewIds, becameSupporterIds);

    const totalStripe = paidInRange.length;

    const base: FunnelStep[] = [
      { key: "view", label: "Unique users who saw paywall / locked content", value: viewedIds.size, identities: viewedIds, color: "#ec4899" },
      { key: "become", label: "Unique users who clicked “Become a Supporter”", value: becameSupporterIds.size, identities: becameSupporterIds, color: "#a855f7" },
      { key: "signup_click", label: "Unique users who started signup form", value: startedSignupIds.size, identities: startedSignupIds, color: "#6366f1" },
      { key: "signup_submit", label: "Unique users who submitted signup", value: submittedIds.size, identities: submittedIds, color: "#22d3ee" },
      { key: "redirected", label: "Unique users redirected to Stripe checkout", value: union(redirectedIds, paidIds).size, identities: union(redirectedIds, paidIds), color: "#2dd4bf" },
      { key: "paid", label: "Unique users with completed checkout", value: paidIds.size, identities: paidIds, color: "#f59e0b" },
    ];
    const top = Math.max(1, base[0].value);
    const steps = base.map((s, i) => {
      const prev = i === 0 ? s.value : base[i - 1].value;
      const dropRate = i === 0 || prev === 0 ? 0 : 1 - s.value / prev;
      return {
        ...s,
        pctOfTop: (s.value / top) * 100,
        dropRate,
        conversionFromPrev: prev === 0 ? 0 : s.value / prev,
      };
    });
    return {
      steps,
      paidTotalStripe: totalStripe,
      paidUnlinked: Math.max(0, totalStripeIds.size - completedLinkedIds.size),
    };
  }, [events, pending, range]);

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
            <div className="text-[11px] text-muted-foreground">
              Showing data for: <span className="font-semibold text-foreground">{RANGES.find((r) => r.key === range)?.label}</span>
            </div>
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
                        {(s.conversionFromPrev * 100).toFixed(1)}% of previous
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
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 text-[11px] text-muted-foreground">
              <span>
                Total Stripe payments in range:{" "}
                <span className="font-semibold text-foreground tabular-nums">{paidTotalStripe}</span>
              </span>
              {paidUnlinked > 0 && (
                <span>
                  Unlinked (legacy / no metadata):{" "}
                  <span className="font-semibold tabular-nums" style={{ color: "#f87171" }}>
                    {paidUnlinked}
                  </span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Counts are unique users, not repeated clicks. New anonymous steps are linked by visitor ID until the user logs in; old anonymous rows without IDs are counted once each so they do not disappear.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ConversionFunnel;
