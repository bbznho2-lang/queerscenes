import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Users, BarChart3, Crown, Mail, Eye, Calendar, CreditCard, Trash2, ChevronLeft, ChevronRight, MessageCircle, MousePointerClick, Send, X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import SiteNoteAdmin from "@/components/SiteNoteAdmin";
import PaywallCustomizationsAdmin from "@/components/PaywallCustomizationsAdmin";
import FeaturedEpisodesAdmin from "@/components/FeaturedEpisodesAdmin";


interface Profile {
  id: string;
  user_id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  is_premium: boolean;
  premium_plan: string | null;
  premium_expires_at: string | null;
  created_at: string;
}

interface ClickStat {
  title: string;
  clicks: number;
}

interface AggregatedUserClick {
  user_name: string;
  user_email: string;
  content_title: string;
  episode_label: string;
  click_count: number;
  last_clicked_at: string;
}


const AdminStatsCards = ({ totalUsers, premiumUsers, totalClicks }: { totalUsers: number; premiumUsers: number; totalClicks: number }) => {
  const items = [
    { value: totalUsers, label: "Total users", color: "#ec4899" }, // pink
    { value: premiumUsers, label: "Supporters", color: "#2dd4bf" }, // teal
    { value: totalClicks, label: "Clicks", color: "#f59e0b" }, // amber
  ];
  return (
    <div className="grid grid-cols-3 gap-3 sm:gap-4">
      {items.map((it, idx) => (
        <motion.div key={it.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.08 }}>
          <Card className="bg-card border-border">
            <CardContent className="p-4 sm:p-5">
              <p
                className="font-extrabold leading-none tracking-tight"
                style={{ color: it.color, fontSize: "clamp(28px, 6vw, 40px)", fontFamily: "'Sora', system-ui, sans-serif" }}
              >
                {it.value}
              </p>
              <p className="text-xs text-muted-foreground mt-1.5">{it.label}</p>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};

const Admin = () => {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [clickStats, setClickStats] = useState<ClickStat[]>([]);
  const [aggregatedClicks, setAggregatedClicks] = useState<AggregatedUserClick[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [premiumEmail, setPremiumEmail] = useState("");
  const [addingPremium, setAddingPremium] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [clicksPage, setClicksPage] = useState(1);
  const [supporterEvents, setSupporterEvents] = useState<Array<{ id: string; event_type: string; source: string | null; user_id: string | null; content_id: string | null; created_at: string; metadata: any }>>([]);
  const [eventsPage, setEventsPage] = useState(1);
  // Independent signup timestamps for the "last 14 days" chart. Kept separate from
  // the paginated `profiles` list so realtime re-fetch races cannot truncate it.
  const [recentSignupDates, setRecentSignupDates] = useState<string[]>([]);
  const EVENTS_PER_PAGE = 15;

  const USERS_PER_PAGE = 20;
  const CLICKS_PER_PAGE = 20;

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate("/browse");
    }
  }, [user, isAdmin, loading, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    fetchData();
    // Poll every 30s so the "today" bar keeps growing even if a realtime
    // event is missed (WebSocket drops, tab throttling, RLS delays, etc.).
    const t = window.setInterval(() => { fetchData(false); }, 30_000);
    return () => window.clearInterval(t);
  }, [isAdmin]);

  // Realtime for new clicks
  useEffect(() => {
    if (!isAdmin) return;

    const clicksChannel = supabase
      .channel("admin-clicks-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "content_clicks",
        },
        () => {
          fetchData(false);
        }
      )
      .subscribe();

    const profilesChannel = supabase
      .channel("admin-profiles-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => {
          fetchData(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(clicksChannel);
      supabase.removeChannel(profilesChannel);
    };
  }, [isAdmin]);


  const fetchData = async (showLoading = true) => {
    if (showLoading) setLoadingData(true);

    // Dedicated fetch for the "last 14 days" chart. Paginated to bypass the
    // 1000-row PostgREST cap and independent of the full `profiles` list so
    // realtime re-fetches never truncate the chart.
    // Use a 16-day cutoff so viewers in any timezone always include the full
    // local "today" bucket even when the browser is ahead of/behind UTC.
    const since14 = new Date();
    since14.setUTCDate(since14.getUTCDate() - 16);
    since14.setUTCHours(0, 0, 0, 0);
    const signupDates: string[] = [];
    const SIGNUP_PAGE = 1000;
    for (let from = 0; ; from += SIGNUP_PAGE) {
      const { data, error } = await supabase
        .from("profiles")
        .select("created_at")
        .gte("created_at", since14.toISOString())
        .order("created_at", { ascending: false })
        .range(from, from + SIGNUP_PAGE - 1);
      if (error) { console.error("recent signups fetch error", error); break; }
      if (!data || data.length === 0) break;
      signupDates.push(...data.map((r: { created_at: string }) => r.created_at));
      if (data.length < SIGNUP_PAGE) break;
    }
    setRecentSignupDates(signupDates);

    // Supabase caps rows at 1000 per request — paginate to fetch every profile.
    const allProfiles: Profile[] = [];
    const PAGE = 1000;
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .range(from, from + PAGE - 1);
      if (error || !data || data.length === 0) break;
      allProfiles.push(...(data as Profile[]));
      if (data.length < PAGE) break;
    }
    setProfiles(allProfiles);


    const { data: clicks } = await supabase
      .from("content_clicks")
      .select("content_id, user_id, clicked_at, episode_id")
      .order("clicked_at", { ascending: false });

    if (clicks && clicks.length > 0) {
      const countMap: Record<string, number> = {};
      clicks.forEach((c: any) => {
        countMap[c.content_id] = (countMap[c.content_id] || 0) + 1;
      });
      const contentIds = [...new Set(clicks.map((c: any) => c.content_id))];
      const episodeIds = [...new Set(clicks.map((c: any) => c.episode_id).filter(Boolean))];
      const { data: contents } = await supabase
        .from("contents")
        .select("id, title")
        .in("id", contentIds);

      const contentMap: Record<string, string> = {};
      (contents || []).forEach((c: any) => { contentMap[c.id] = c.title; });

      let episodeMap: Record<string, { title: string; episode_number: number; season: number }> = {};
      if (episodeIds.length > 0) {
        const { data: eps } = await supabase
          .from("episodes")
          .select("id, title, episode_number, season")
          .in("id", episodeIds as string[]);
        (eps || []).forEach((e: any) => { episodeMap[e.id] = { title: e.title, episode_number: e.episode_number, season: e.season || 1 }; });
      }

      const profileMap: Record<string, { email: string; name: string }> = {};
      allProfiles.forEach((p) => {
        profileMap[p.user_id] = {
          email: p.email || "No email",
          name: [p.first_name, p.last_name].filter(Boolean).join(" ") || "No name",
        };
      });

      // Aggregate clicks: group by user + content + episode, count occurrences
      const aggMap: Record<string, AggregatedUserClick> = {};
      clicks.forEach((c: any) => {
        const epKey = c.episode_id || "main";
        const key = `${c.user_id}__${c.content_id}__${epKey}`;
        const ep = c.episode_id ? episodeMap[c.episode_id] : null;
        const epLabel = ep ? `S${ep.season} · E${ep.episode_number} — ${ep.title}` : "—";
        if (!aggMap[key]) {
          aggMap[key] = {
            user_name: profileMap[c.user_id]?.name || "Unknown",
            user_email: profileMap[c.user_id]?.email || "Unknown",
            content_title: contentMap[c.content_id] || "Deleted content",
            episode_label: epLabel,
            click_count: 0,
            last_clicked_at: c.clicked_at,
          };
        }
        aggMap[key].click_count += 1;
        if (c.clicked_at > aggMap[key].last_clicked_at) {
          aggMap[key].last_clicked_at = c.clicked_at;
        }
      });
      const aggregated = Object.values(aggMap).sort((a, b) => new Date(b.last_clicked_at).getTime() - new Date(a.last_clicked_at).getTime());
      setAggregatedClicks(aggregated);

      const stats: ClickStat[] = (contents || [])
        .map((c: any) => ({
          title: c.title.length > 15 ? c.title.slice(0, 15) + "…" : c.title,
          clicks: countMap[c.id] || 0,
        }))
        .sort((a: ClickStat, b: ClickStat) => b.clicks - a.clicks)
        .slice(0, 10);

      setClickStats(stats);
    }


    // Fetch supporter events (paywall analytics)
    const { data: events } = await supabase
      .from("supporter_events" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500) as any;
    setSupporterEvents((events as any) || []);

    if (showLoading) setLoadingData(false);

  };

  const applyPremiumUpdate = async (
    profile: Profile,
    isPremium: boolean,
    premiumPlan: string | null,
    premiumExpiresAt: string | null
  ) => {
    const { data, error } = await (supabase.rpc as any)("admin_set_profile_premium", {
      _profile_id: profile.id,
      _is_premium: isPremium,
      _premium_plan: premiumPlan,
      _premium_expires_at: premiumExpiresAt,
    });

    if (error) throw error;
    const updated = Array.isArray(data) ? data[0] : data;
    if (!updated) throw new Error("Profile not found");

    setProfiles((current) => current.map((p) => p.id === profile.id ? { ...p, ...updated } : p));
    return updated as Profile;
  };


  const togglePremium = async (profile: Profile) => {
    const newPremium = !profile.is_premium;
    try {
      await applyPremiumUpdate(
        profile,
        newPremium,
        newPremium ? (profile.premium_plan || "lifetime") : null,
        newPremium ? profile.premium_expires_at : null
      );
      toast.success(newPremium ? "Supporter activated" : "Supporter removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error updating");
    }
  };

  const updatePremiumPlan = async (profile: Profile, plan: string) => {
    const now = new Date();
    let expiresAt: Date;
    if (plan === "monthly") {
      expiresAt = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
    } else if (plan === "quarterly") {
      expiresAt = new Date(now.getFullYear(), now.getMonth() + 3, now.getDate());
    } else {
      expiresAt = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
    }
    try {
      await applyPremiumUpdate(profile, true, plan, expiresAt.toISOString());
      const planLabels: Record<string, string> = { monthly: "Monthly €11.90", quarterly: "Quarterly €29.90", annual: "Annual €106.90" };
      toast.success(`Plan set to ${planLabels[plan] || plan}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error updating plan");
    }
  };

  const updateExpirationDate = async (profile: Profile, dateStr: string) => {
    if (!dateStr) return;
    try {
      await applyPremiumUpdate(profile, true, profile.premium_plan || "monthly", new Date(dateStr).toISOString());
      toast.success("Expiration date updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error updating date");
    }
  };

  const grantPremiumByEmail = async () => {
    const emailTrimmed = premiumEmail.trim().toLowerCase();
    if (!emailTrimmed) { toast.error("Please enter an email address"); return; }
    setAddingPremium(true);
    try {
      const { data: profile, error } = await supabase.from("profiles").select("*").ilike("email", emailTrimmed).maybeSingle();
      if (error) { toast.error("Error searching for user"); return; }
      if (!profile) { toast.error("No user found with this email."); return; }
      await applyPremiumUpdate(profile as Profile, true, "lifetime", null);
      toast.success(`Supporter access granted to ${emailTrimmed}!`);
      setPremiumEmail("");
      fetchData(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error granting premium");
    } finally {
      setAddingPremium(false);
    }
  };

  const deleteUser = async (profile: Profile) => {
    setDeletingUserId(profile.user_id);
    try {
      const { data, error } = await supabase.functions.invoke("delete-user", { body: { user_id: profile.user_id } });
      if (error) { toast.error(error.message || "Error deleting user"); return; }
      if (data?.error) { toast.error(data.error); return; }
      toast.success(`User ${profile.email || "unknown"} deleted`);
      setProfiles((current) => current.filter((p) => p.user_id !== profile.user_id));
      setExpandedUser(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error deleting user");
    } finally {
      setDeletingUserId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(profiles.length / USERS_PER_PAGE));
  const sortedProfiles = useMemo(() => {
    // Priority: 2 = expired supporter (top), 1 = active supporter, 0 = free
    const supporterPriority = (p: Profile) => {
      if (!p.is_premium) return 0;
      if (!p.premium_expires_at) return 1; // lifetime active
      return new Date(p.premium_expires_at) > new Date() ? 1 : 2;
    };
    return [...profiles].sort((a, b) => {
      const aP = supporterPriority(a);
      const bP = supporterPriority(b);
      if (aP !== bP) return bP - aP;
      // Within expired group: most recently expired first
      if (aP === 2 && a.premium_expires_at && b.premium_expires_at) {
        return new Date(b.premium_expires_at).getTime() - new Date(a.premium_expires_at).getTime();
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [profiles]);

  const paginatedProfiles = useMemo(() => {
    const start = (currentPage - 1) * USERS_PER_PAGE;
    return sortedProfiles.slice(start, start + USERS_PER_PAGE);
  }, [sortedProfiles, currentPage]);

  const totalClickPages = Math.max(1, Math.ceil(aggregatedClicks.length / CLICKS_PER_PAGE));
  const paginatedClicks = useMemo(() => {
    const start = (clicksPage - 1) * CLICKS_PER_PAGE;
    return aggregatedClicks.slice(start, start + CLICKS_PER_PAGE);
  }, [aggregatedClicks, clicksPage]);

  const chartConfig = {
    clicks: { label: "Clicks", color: "hsl(var(--primary))" },
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const totalUsers = profiles.length;
  const premiumUsers = profiles.filter((p) => p.is_premium).length;
  const totalClicks = clickStats.reduce((a, b) => a + b.clicks, 0);

  // New users per day — last 14 days (use LOCAL calendar days so "today"
  // matches the viewer's timezone and doesn't get bucketed into yesterday.)
  const localDayKey = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
  const newUsersByDay = (() => {
    const days: { key: string; label: string; count: number }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      days.push({
        key: localDayKey(d),
        label: d.toLocaleDateString("en-US", { month: "short", day: "2-digit" }),
        count: 0,
      });
    }
    const idx: Record<string, number> = {};
    days.forEach((d, i) => { idx[d.key] = i; });
    recentSignupDates.forEach((createdAt) => {
      const k = localDayKey(new Date(createdAt));
      if (k in idx) days[idx[k]].count += 1;
    });
    return days;
  })();
  const maxNewUsers = Math.max(1, ...newUsersByDay.map((d) => d.count));
  const newUsersTotal14d = newUsersByDay.reduce((a, b) => a + b.count, 0);


  const isExpired = (date: string | null) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-4 h-14 sm:h-16 flex items-center gap-3">
          <button onClick={() => navigate("/browse")} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold neon-text-purple" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Admin Panel
          </h1>
        </div>
      </header>

      <main className="pt-20 px-4 pb-12 max-w-7xl mx-auto space-y-8">
        <AdminStatsCards totalUsers={totalUsers} premiumUsers={premiumUsers} totalClicks={totalClicks} />



        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2 text-foreground">
              <span className="flex items-center gap-2">
                <Calendar className="w-5 h-5" style={{ color: "#2dd4bf" }} />
                New users — last 14 days
              </span>
              <span className="text-xs font-normal text-muted-foreground">
                {newUsersTotal14d} new {newUsersTotal14d === 1 ? "signup" : "signups"}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {newUsersByDay.map((d) => (
                <div key={d.key} className="flex items-center gap-3 text-xs">
                  <span className="w-14 shrink-0 text-muted-foreground tabular-nums">{d.label}</span>
                  <div className="flex-1 h-5 rounded-md bg-muted/40 overflow-hidden">
                    <div
                      className="h-full rounded-md transition-all"
                      style={{
                        width: `${(d.count / maxNewUsers) * 100}%`,
                        background: "linear-gradient(90deg, #ec4899, #a855f7, #2dd4bf)",
                        minWidth: d.count > 0 ? "6px" : "0",
                      }}
                    />
                  </div>
                  <span className="w-12 shrink-0 text-right font-semibold tabular-nums" style={{ color: d.count > 0 ? "#f59e0b" : "hsl(var(--muted-foreground))" }}>
                    {d.count}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <SiteNoteAdmin />
        <PaywallCustomizationsAdmin />
        <FeaturedEpisodesAdmin />


        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <BarChart3 className="w-5 h-5 text-primary" />
              Most Clicked Content
            </CardTitle>
          </CardHeader>
          <CardContent>
            {clickStats.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <BarChart data={clickStats}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="title" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="clicks" fill="var(--color-clicks)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <p className="text-muted-foreground text-center py-12 text-sm">No clicks recorded yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Supporter Conversion Events */}
        {(() => {
          const totals = supporterEvents.reduce<Record<string, number>>((acc, e) => {
            acc[e.event_type] = (acc[e.event_type] || 0) + 1;
            return acc;
          }, {});
          const totalEventPages = Math.max(1, Math.ceil(supporterEvents.length / EVENTS_PER_PAGE));
          const start = (eventsPage - 1) * EVENTS_PER_PAGE;
          const pageEvents = supporterEvents.slice(start, start + EVENTS_PER_PAGE);
          const profileById: Record<string, Profile> = {};
          profiles.forEach((p) => { profileById[p.user_id] = p; });
          return (
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Crown className="w-5 h-5 text-primary" />
                  Supporter Paywall Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[
                    { key: "locked_content_view", label: "Locked title viewed", color: "#2dd4bf" },
                    { key: "become_supporter_click", label: "Plan clicked", color: "#ec4899" },
                    { key: "paywall_signup_submit", label: "New signups", color: "#d946ef" },
                    { key: "paywall_view", label: "Paywall opened", color: "#f59e0b" },
                  ].map((item) => (
                    <div key={item.key} className="rounded-xl border border-border bg-card px-4 py-3">
                      <p
                        className="font-extrabold leading-none tracking-tight"
                        style={{ color: item.color, fontSize: "clamp(24px, 5vw, 34px)", fontFamily: "'Sora', system-ui, sans-serif" }}
                      >
                        {totals[item.key] || 0}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1.5">{item.label}</p>
                    </div>
                  ))}
                </div>
                {supporterEvents.length > 0 ? (
                  <div className="space-y-1">
                    <div className="hidden sm:grid grid-cols-[1.2fr_1fr_1fr_1.2fr_140px] gap-3 px-3 py-2 text-xs text-muted-foreground font-medium border-b border-border">
                      <span>Event</span>
                      <span>Source</span>
                      <span>User</span>
                      <span>Content ID</span>
                      <span className="text-right">When</span>
                    </div>
                    {pageEvents.map((ev) => {
                      const prof = ev.user_id ? profileById[ev.user_id] : null;
                      return (
                        <div key={ev.id} className="grid grid-cols-1 sm:grid-cols-[1.2fr_1fr_1fr_1.2fr_140px] gap-1 sm:gap-3 px-3 py-2 rounded-lg hover:bg-muted/30 border-b border-border/30 last:border-0">
                          <span className="text-xs sm:text-sm font-semibold text-primary">{({
                            paywall_view: "Paywall opened",
                            locked_content_view: "Locked title viewed",
                            become_supporter_click: "Supporter plan clicked",
                            supporter_player_click: "Supporter player clicked",
                            paywall_signup_click: "Signup button clicked",
                            paywall_signup_submit: "Signup submitted",
                            watch_free_fallback_click: "Watch free fallback",
                          } as Record<string, string>)[ev.event_type] || ev.event_type}</span>
                          <span className="text-xs sm:text-sm text-foreground truncate">{ev.source || "—"}</span>
                          <span className="text-xs sm:text-sm text-muted-foreground truncate">{prof?.email || (ev.user_id ? ev.user_id.slice(0, 8) : "anon")}</span>
                          <span className="text-[11px] sm:text-xs text-muted-foreground truncate">{ev.content_id?.slice(0, 8) || "—"}</span>
                          <span className="text-xs text-muted-foreground text-right">{new Date(ev.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                      );
                    })}
                    {totalEventPages > 1 && (
                      <div className="flex items-center justify-between pt-4 border-t border-border mt-2">
                        <span className="text-xs text-muted-foreground">
                          Page {eventsPage} of {totalEventPages} ({supporterEvents.length} events)
                        </span>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" disabled={eventsPage <= 1} onClick={() => setEventsPage((p) => Math.max(1, p - 1))}>
                            <ChevronLeft className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm" disabled={eventsPage >= totalEventPages} onClick={() => setEventsPage((p) => Math.min(totalEventPages, p + 1))}>
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-6 text-sm">No paywall events yet.</p>
                )}
              </CardContent>
            </Card>
          );
        })()}

        {/* User Click Details - Aggregated */}

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <MousePointerClick className="w-5 h-5 text-primary" />
              User Click Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            {aggregatedClicks.length > 0 ? (
              <div className="space-y-1">
                <div className="hidden sm:grid grid-cols-[1fr_1fr_1.2fr_1.2fr_70px_120px] gap-3 px-3 py-2 text-xs text-muted-foreground font-medium border-b border-border">
                  <span>User</span>
                  <span>Email</span>
                  <span>Content</span>
                  <span>Episode</span>
                  <span className="text-center">Clicks</span>
                  <span className="text-right">Last Click</span>
                </div>
                {paginatedClicks.map((click, i) => (
                  <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1.2fr_1.2fr_70px_120px] gap-1 sm:gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/30 transition-colors border-b border-border/30 last:border-0">
                    <span className="text-sm text-foreground font-medium truncate">{click.user_name}</span>
                    <span className="text-xs sm:text-sm text-muted-foreground truncate">{click.user_email}</span>
                    <span className="text-xs sm:text-sm text-foreground truncate">{click.content_title}</span>
                    <span className="text-xs sm:text-sm text-muted-foreground truncate" title={click.episode_label}>{click.episode_label}</span>
                    <span className="text-sm font-semibold text-center text-primary">{click.click_count}×</span>
                    <span className="text-xs text-muted-foreground text-right">{new Date(click.last_clicked_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                ))}
                {totalClickPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t border-border mt-2">
                    <span className="text-xs text-muted-foreground">
                      Page {clicksPage} of {totalClickPages} ({aggregatedClicks.length} entries)
                    </span>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" disabled={clicksPage <= 1} onClick={() => setClicksPage((p) => Math.max(1, p - 1))}>
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" disabled={clicksPage >= totalClickPages} onClick={() => setClicksPage((p) => Math.min(totalClickPages, p + 1))}>
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8 text-sm">No clicks recorded yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Support: Telegram */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <MessageCircle className="w-5 h-5 text-secondary" />
              Support
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Support requests now go directly to your Telegram. Users see a Reply button on every message that opens
              this same chat.
            </p>
            <a
              href="https://t.me/L7kznr"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/90 transition-colors text-sm font-medium"
            >
              <Send className="w-4 h-4" />
              Open @L7kznr on Telegram
            </a>
          </CardContent>
        </Card>

        {/* Grant Supporter Access by Email */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Mail className="w-5 h-5 text-secondary" />
              Grant Supporter Access by Email
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 items-end">
              <div className="flex-1 space-y-1.5">
                <label className="text-xs text-muted-foreground">User email</label>
                <Input type="email" placeholder="user@email.com" value={premiumEmail} onChange={(e) => setPremiumEmail(e.target.value)} className="bg-muted border-border" />
              </div>
              <Button onClick={grantPremiumByEmail} disabled={addingPremium} className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
                <Crown className="w-4 h-4 mr-1" />
                {addingPremium ? "Granting..." : "Grant Supporter"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <CreditCard className="w-5 h-5 text-secondary" />
              Manage Users & Supporters
            </CardTitle>
          </CardHeader>
          <CardContent>
            {profiles.length > 0 ? (
              <div className="space-y-1">
                <div className="hidden sm:grid grid-cols-[1fr_120px_80px_80px_50px] gap-4 px-3 py-2 text-xs text-muted-foreground font-medium border-b border-border">
                  <span>User</span>
                  <span>Plan</span>
                  <span>Supporter</span>
                  <span>Date</span>
                  <span></span>
                </div>
                {paginatedProfiles.map((p) => {
                  const expired = isExpired(p.premium_expires_at);
                  const isExpanded = expandedUser === p.id;
                  return (
                    <div key={p.id} className="border-b border-border/50 last:border-0">
                      <div
                        className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_120px_80px_80px_50px] gap-3 sm:gap-4 items-center px-3 py-3 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => setExpandedUser(isExpanded ? null : p.id)}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-foreground truncate font-medium">
                              {p.first_name || p.last_name ? `${p.first_name || ""} ${p.last_name || ""}`.trim() : "No name"}
                            </span>
                            {p.is_premium && (
                              <span className={expired ? "qs-badge-expired inline-flex items-center gap-1" : "qs-badge-supporter"}>
                                <Crown className="w-2.5 h-2.5" />
                                {expired ? "EXPIRED" : "SUPPORTER"}
                              </span>
                            )}

                          </div>
                          <span className="text-xs text-muted-foreground truncate block">{p.email || "No email"}</span>
                        </div>
                        <span className="text-xs text-muted-foreground hidden sm:block">
                          {p.premium_plan === "monthly" ? "Monthly €11.90" : p.premium_plan === "quarterly" ? "Quarterly €29.90" : p.premium_plan === "annual" ? "Annual €106.90" : "—"}
                        </span>
                        <div className="hidden sm:block">
                          <Switch checked={p.is_premium} onCheckedChange={() => togglePremium(p)} onClick={(e) => e.stopPropagation()} />
                        </div>
                        <span className="text-xs text-muted-foreground hidden sm:block">{new Date(p.created_at).toLocaleDateString("en-US")}</span>
                        <div className="hidden sm:flex justify-center">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button onClick={(e) => e.stopPropagation()} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete user?</AlertDialogTitle>
                                <AlertDialogDescription>This will permanently delete <strong>{p.email || "this user"}</strong> and all their data.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteUser(p)} disabled={deletingUserId === p.user_id} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                  {deletingUserId === p.user_id ? "Deleting..." : "Delete"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                        <div className="sm:hidden flex items-center gap-2">
                          <Switch checked={p.is_premium} onCheckedChange={() => togglePremium(p)} onClick={(e) => e.stopPropagation()} />
                        </div>
                      </div>
                      {isExpanded && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-3 pb-4 space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-lg bg-muted/30">
                            <div className="space-y-1.5">
                              <label className="text-xs text-muted-foreground flex items-center gap-1"><CreditCard className="w-3 h-3" /> Plan</label>
                              <Select value={p.premium_plan || "none"} onValueChange={(val) => { if (val === "none") return; updatePremiumPlan(p, val); }}>
                                <SelectTrigger className="h-9 text-xs bg-background"><SelectValue placeholder="Select plan" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">No plan</SelectItem>
                                  <SelectItem value="monthly" style={{ color: 'hsl(330, 85%, 55%)' }}>Monthly — €11.90</SelectItem>
                                  <SelectItem value="quarterly" style={{ color: 'hsl(280, 80%, 55%)' }}>Quarterly — €29.90</SelectItem>
                                  <SelectItem value="annual">Annual — €106.90</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> Expires at</label>
                              <Input type="date" className="h-9 text-xs bg-background" value={p.premium_expires_at ? new Date(p.premium_expires_at).toISOString().split("T")[0] : ""} onChange={(e) => updateExpirationDate(p, e.target.value)} />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs text-muted-foreground">Status</label>
                              <div className={`h-9 flex items-center px-3 rounded-md text-xs font-medium ${!p.is_premium ? 'bg-muted text-muted-foreground' : expired ? 'bg-destructive/10 text-destructive' : 'bg-secondary/10 text-secondary'}`}>
                                {!p.is_premium ? "Free" : expired ? "Expired" : p.premium_expires_at ? `Active until ${new Date(p.premium_expires_at).toLocaleDateString("en-US")}` : "Lifetime supporter"}
                              </div>
                            </div>
                          </div>
                          <div className="sm:hidden">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm" className="w-full"><Trash2 className="w-3.5 h-3.5 mr-1" /> Delete User</Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete user?</AlertDialogTitle>
                                  <AlertDialogDescription>This will permanently delete <strong>{p.email || "this user"}</strong> and all their data.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteUser(p)} disabled={deletingUserId === p.user_id} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                    {deletingUserId === p.user_id ? "Deleting..." : "Delete"}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  );
                })}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t border-border mt-2">
                    <span className="text-xs text-muted-foreground">Page {currentPage} of {totalPages} ({profiles.length} users)</span>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}><ChevronLeft className="w-4 h-4" /></Button>
                      <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}><ChevronRight className="w-4 h-4" /></Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8 text-sm">No users registered yet.</p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Admin;
