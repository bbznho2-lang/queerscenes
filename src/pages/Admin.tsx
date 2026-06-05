import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Users, BarChart3, Crown, Mail, Eye, Calendar, CreditCard, Trash2, ChevronLeft, ChevronRight, MessageCircle, MousePointerClick, Send, X } from "lucide-react";
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

interface SupportChat {
  id: string;
  user_name: string;
  user_email: string;
  status: string;
  created_at: string;
  updated_at: string;
  unread_count?: number;
}

interface ChatMessage {
  id: string;
  chat_id: string;
  sender_role: string;
  message: string;
  created_at: string;
}

const AdminStatsCards = ({ totalUsers, premiumUsers, totalClicks }: { totalUsers: number; premiumUsers: number; totalClicks: number }) => (
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="bg-card border-border">
        <CardContent className="flex items-center gap-4 p-5">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{totalUsers}</p>
            <p className="text-xs text-muted-foreground">Total users</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
      <Card className="bg-card border-border">
        <CardContent className="flex items-center gap-4 p-5">
          <div className="w-11 h-11 rounded-xl bg-secondary/10 flex items-center justify-center">
            <Crown className="w-5 h-5 text-secondary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{premiumUsers}</p>
            <p className="text-xs text-muted-foreground">Supporters</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
      <Card className="bg-card border-border">
        <CardContent className="flex items-center gap-4 p-5">
          <div className="w-11 h-11 rounded-xl bg-accent/10 flex items-center justify-center">
            <Eye className="w-5 h-5 text-accent" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{totalClicks}</p>
            <p className="text-xs text-muted-foreground">Total clicks</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  </div>
);

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
  const [chatsPage, setChatsPage] = useState(1);
  const [supporterEvents, setSupporterEvents] = useState<Array<{ id: string; event_type: string; source: string | null; user_id: string | null; content_id: string | null; created_at: string; metadata: any }>>([]);
  const [eventsPage, setEventsPage] = useState(1);
  const EVENTS_PER_PAGE = 15;

  const chatScrollRef = useRef<HTMLDivElement>(null);
  const USERS_PER_PAGE = 20;
  const CLICKS_PER_PAGE = 20;
  const CHATS_PER_PAGE = 10;

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate("/browse");
    }
  }, [user, isAdmin, loading, navigate]);

  useEffect(() => {
    if (isAdmin) fetchData();
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
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(clicksChannel);
    };
  }, [isAdmin]);


  const fetchData = async () => {
    setLoadingData(true);
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    const allProfiles = (profilesData as Profile[]) || [];
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

    // Fetch support chats
    await fetchChats();

    // Fetch supporter events (paywall analytics)
    const { data: events } = await supabase
      .from("supporter_events" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500) as any;
    setSupporterEvents((events as any) || []);

    setLoadingData(false);

  };

  const openChat = async (chatId: string) => {
    setActiveChatId(chatId);
    const { data } = await supabase
      .from("chat_messages" as any)
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true }) as any;
    setChatMessages((data as ChatMessage[]) || []);
  };

  const sendAdminReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminReply.trim() || !activeChatId) return;
    setSendingReply(true);
    try {
      const { error } = await supabase
        .from("chat_messages" as any)
        .insert({ chat_id: activeChatId, sender_role: "admin", message: adminReply.trim() } as any);
      if (error) {
        toast.error("Error sending reply");
        return;
      }
      setAdminReply("");
    } finally {
      setSendingReply(false);
    }
  };

  const deleteChat = async (chatId: string) => {
    const { error } = await supabase
      .from("support_chats" as any)
      .delete()
      .eq("id", chatId) as any;
    if (error) {
      toast.error("Error deleting chat");
      return;
    }
    setSupportChats((chats) => chats.filter((c) => c.id !== chatId));
    if (activeChatId === chatId) {
      setActiveChatId(null);
      setChatMessages([]);
    }
    toast.success("Chat deleted");
  };

  const togglePremium = async (profile: Profile) => {
    const newPremium = !profile.is_premium;
    const updateData: any = { is_premium: newPremium };
    if (!newPremium) {
      updateData.premium_plan = null;
      updateData.premium_expires_at = null;
    }
    const { error } = await supabase.from("profiles").update(updateData).eq("id", profile.id);
    if (error) { toast.error("Error updating"); return; }
    toast.success(newPremium ? "Supporter activated" : "Supporter removed");
    setProfiles(profiles.map((p) => p.id === profile.id ? { ...p, ...updateData } : p));
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
    const { error } = await supabase
      .from("profiles")
      .update({ is_premium: true, premium_plan: plan, premium_expires_at: expiresAt.toISOString() })
      .eq("id", profile.id);
    if (error) { toast.error("Error updating plan"); return; }
    const planLabels: Record<string, string> = { monthly: "Monthly €9.99", quarterly: "Quarterly €24.99", annual: "Annual €89.99" };
    toast.success(`Plan set to ${planLabels[plan] || plan}`);
    setProfiles(profiles.map((p) => p.id === profile.id ? { ...p, is_premium: true, premium_plan: plan, premium_expires_at: expiresAt.toISOString() } : p));
  };

  const updateExpirationDate = async (profile: Profile, dateStr: string) => {
    if (!dateStr) return;
    const { error } = await supabase.from("profiles").update({ premium_expires_at: new Date(dateStr).toISOString() }).eq("id", profile.id);
    if (error) { toast.error("Error updating date"); return; }
    toast.success("Expiration date updated");
    setProfiles(profiles.map((p) => p.id === profile.id ? { ...p, premium_expires_at: new Date(dateStr).toISOString() } : p));
  };

  const grantPremiumByEmail = async () => {
    const emailTrimmed = premiumEmail.trim().toLowerCase();
    if (!emailTrimmed) { toast.error("Please enter an email address"); return; }
    setAddingPremium(true);
    try {
      const { data: profile, error } = await supabase.from("profiles").select("*").ilike("email", emailTrimmed).maybeSingle();
      if (error) { toast.error("Error searching for user"); return; }
      if (!profile) { toast.error("No user found with this email."); return; }
      const { error: updateError } = await supabase.from("profiles").update({ is_premium: true, premium_plan: "lifetime", premium_expires_at: null }).eq("id", profile.id);
      if (updateError) { toast.error("Error granting premium"); return; }
      toast.success(`Supporter access granted to ${emailTrimmed}!`);
      setPremiumEmail("");
      fetchData();
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

  const isExpired = (date: string | null) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  const activeChat = supportChats.find((c) => c.id === activeChatId);

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

        <SiteNoteAdmin />
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
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                  {[
                    { key: "paywall_view", label: "Paywall opened" },
                    { key: "locked_content_view", label: "Locked title viewed" },
                    { key: "become_supporter_click", label: "Supporter plan clicked" },
                    { key: "paywall_signup_submit", label: "New signups" },
                  ].map((item) => (
                    <div key={item.key} className="rounded-lg border border-border bg-muted/30 px-3 py-2">
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="text-lg font-bold text-foreground">{totals[item.key] || 0}</p>
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
                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${expired ? 'bg-destructive/20 text-destructive' : 'bg-primary/20 text-primary'}`}>
                                <Crown className="w-2.5 h-2.5" />
                                {expired ? "EXPIRED" : "SUPPORTER"}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground truncate block">{p.email || "No email"}</span>
                        </div>
                        <span className="text-xs text-muted-foreground hidden sm:block">
                          {p.premium_plan === "monthly" ? "Monthly €9.99" : p.premium_plan === "quarterly" ? "Quarterly €24.99" : p.premium_plan === "annual" ? "Annual €89.99" : "—"}
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
                                  <SelectItem value="monthly" style={{ color: 'hsl(330, 85%, 55%)' }}>Monthly — €9.99</SelectItem>
                                  <SelectItem value="quarterly" style={{ color: 'hsl(280, 80%, 55%)' }}>Quarterly — €24.99</SelectItem>
                                  <SelectItem value="annual">Annual — €89.99</SelectItem>
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
                                {!p.is_premium ? "Free" : expired ? "Expired" : `Active until ${new Date(p.premium_expires_at!).toLocaleDateString("en-US")}`}
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
