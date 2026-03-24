import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Users, BarChart3, Crown, Mail, Eye, Calendar, CreditCard, Trash2, ChevronLeft, ChevronRight, MessageCircle, MousePointerClick } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
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

interface UserClickDetail {
  user_email: string;
  user_name: string;
  content_title: string;
  clicked_at: string;
}

interface SupportMessage {
  id: string;
  name: string;
  email: string;
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
            <p className="text-xs text-muted-foreground">Premium users</p>
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
  const [userClicks, setUserClicks] = useState<UserClickDetail[]>([]);
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [premiumEmail, setPremiumEmail] = useState("");
  const [addingPremium, setAddingPremium] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [clicksPage, setClicksPage] = useState(1);
  const USERS_PER_PAGE = 20;
  const CLICKS_PER_PAGE = 20;

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate("/browse");
    }
  }, [user, isAdmin, loading, navigate]);

  useEffect(() => {
    if (isAdmin) fetchData();
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
      .select("content_id, user_id, clicked_at")
      .order("clicked_at", { ascending: false });

    if (clicks && clicks.length > 0) {
      const countMap: Record<string, number> = {};
      clicks.forEach((c: any) => {
        countMap[c.content_id] = (countMap[c.content_id] || 0) + 1;
      });
      const contentIds = [...new Set(clicks.map((c: any) => c.content_id))];
      const { data: contents } = await supabase
        .from("contents")
        .select("id, title")
        .in("id", contentIds);

      const contentMap: Record<string, string> = {};
      (contents || []).forEach((c: any) => { contentMap[c.id] = c.title; });

      const profileMap: Record<string, { email: string; name: string }> = {};
      allProfiles.forEach((p) => {
        profileMap[p.user_id] = {
          email: p.email || "No email",
          name: [p.first_name, p.last_name].filter(Boolean).join(" ") || "No name",
        };
      });

      const details: UserClickDetail[] = clicks.map((c: any) => ({
        user_email: profileMap[c.user_id]?.email || "Unknown",
        user_name: profileMap[c.user_id]?.name || "Unknown",
        content_title: contentMap[c.content_id] || "Deleted content",
        clicked_at: c.clicked_at,
      }));
      setUserClicks(details);

      const stats: ClickStat[] = (contents || [])
        .map((c: any) => ({
          title: c.title.length > 15 ? c.title.slice(0, 15) + "…" : c.title,
          clicks: countMap[c.id] || 0,
        }))
        .sort((a: ClickStat, b: ClickStat) => b.clicks - a.clicks)
        .slice(0, 10);

      setClickStats(stats);
    }

    // Fetch support messages
    const { data: messages } = await supabase
      .from("support_messages" as any)
      .select("*")
      .order("created_at", { ascending: false }) as any;
    setSupportMessages((messages as SupportMessage[]) || []);

    setLoadingData(false);
  };

  const togglePremium = async (profile: Profile) => {
    const newPremium = !profile.is_premium;
    const updateData: any = { is_premium: newPremium };
    
    if (!newPremium) {
      updateData.premium_plan = null;
      updateData.premium_expires_at = null;
    }

    const { error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", profile.id);
    if (error) {
      toast.error("Error updating");
      return;
    }
    toast.success(newPremium ? "Premium activated" : "Premium removed");
    setProfiles(
      profiles.map((p) =>
        p.id === profile.id ? { ...p, ...updateData } : p
      )
    );
  };

  const updatePremiumPlan = async (profile: Profile, plan: string) => {
    const now = new Date();
    let expiresAt: Date;
    
    if (plan === "monthly") {
      expiresAt = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
    } else {
      expiresAt = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
    }

    const { error } = await supabase
      .from("profiles")
      .update({ 
        is_premium: true, 
        premium_plan: plan, 
        premium_expires_at: expiresAt.toISOString() 
      })
      .eq("id", profile.id);
    
    if (error) {
      toast.error("Error updating plan");
      return;
    }
    toast.success(`Plan set to ${plan === "monthly" ? "Monthly €15.99" : "Annual €159.99"}`);
    setProfiles(
      profiles.map((p) =>
        p.id === profile.id ? { ...p, is_premium: true, premium_plan: plan, premium_expires_at: expiresAt.toISOString() } : p
      )
    );
  };

  const updateExpirationDate = async (profile: Profile, dateStr: string) => {
    if (!dateStr) return;
    const { error } = await supabase
      .from("profiles")
      .update({ premium_expires_at: new Date(dateStr).toISOString() })
      .eq("id", profile.id);
    
    if (error) {
      toast.error("Error updating date");
      return;
    }
    toast.success("Expiration date updated");
    setProfiles(
      profiles.map((p) =>
        p.id === profile.id ? { ...p, premium_expires_at: new Date(dateStr).toISOString() } : p
      )
    );
  };

  const grantPremiumByEmail = async () => {
    const emailTrimmed = premiumEmail.trim().toLowerCase();
    if (!emailTrimmed) {
      toast.error("Please enter an email address");
      return;
    }
    setAddingPremium(true);
    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .ilike("email", emailTrimmed)
        .maybeSingle();

      if (error) {
        toast.error("Error searching for user");
        return;
      }

      if (!profile) {
        toast.error("No user found with this email. They need to create an account first.");
        return;
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ is_premium: true, premium_plan: "lifetime", premium_expires_at: null })
        .eq("id", profile.id);

      if (updateError) {
        toast.error("Error granting premium");
        return;
      }

      toast.success(`Premium granted to ${emailTrimmed}!`);
      setPremiumEmail("");
      fetchData();
    } finally {
      setAddingPremium(false);
    }
  };

  const deleteUser = async (profile: Profile) => {
    setDeletingUserId(profile.user_id);
    try {
      const { data, error } = await supabase.functions.invoke("delete-user", {
        body: { user_id: profile.user_id },
      });
      if (error) {
        toast.error(error.message || "Error deleting user");
        return;
      }
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      toast.success(`User ${profile.email || "unknown"} deleted`);
      setProfiles((current) => current.filter((p) => p.user_id !== profile.user_id));
      setExpandedUser(null);
      setCurrentPage((page) => Math.max(1, Math.min(page, Math.ceil((profiles.length - 1) / USERS_PER_PAGE) || 1)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error deleting user");
    } finally {
      setDeletingUserId(null);
    }
  };

  const deleteSupportMessage = async (id: string) => {
    const { error } = await supabase
      .from("support_messages" as any)
      .delete()
      .eq("id", id) as any;
    if (error) {
      toast.error("Error deleting message");
      return;
    }
    setSupportMessages((msgs) => msgs.filter((m) => m.id !== id));
    toast.success("Message deleted");
  };

  const totalPages = Math.max(1, Math.ceil(profiles.length / USERS_PER_PAGE));
  const paginatedProfiles = useMemo(() => {
    const start = (currentPage - 1) * USERS_PER_PAGE;
    return profiles.slice(start, start + USERS_PER_PAGE);
  }, [profiles, currentPage]);

  const totalClickPages = Math.max(1, Math.ceil(userClicks.length / CLICKS_PER_PAGE));
  const paginatedClicks = useMemo(() => {
    const start = (clicksPage - 1) * CLICKS_PER_PAGE;
    return userClicks.slice(start, start + CLICKS_PER_PAGE);
  }, [userClicks, clicksPage]);

  const chartConfig = {
    clicks: {
      label: "Clicks",
      color: "hsl(var(--primary))",
    },
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

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-4 h-14 sm:h-16 flex items-center gap-3">
          <button
            onClick={() => navigate("/browse")}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1
            className="text-lg font-bold neon-text-purple"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Admin Panel
          </h1>
        </div>
      </header>

      <main className="pt-20 px-4 pb-12 max-w-7xl mx-auto space-y-8">
        <AdminStatsCards totalUsers={totalUsers} premiumUsers={premiumUsers} totalClicks={totalClicks} />

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
              <p className="text-muted-foreground text-center py-12 text-sm">
                No clicks recorded yet.
              </p>
            )}
          </CardContent>
        </Card>

        {/* User Click Details */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <MousePointerClick className="w-5 h-5 text-primary" />
              User Click Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            {userClicks.length > 0 ? (
              <div className="space-y-1">
                <div className="hidden sm:grid grid-cols-[1fr_1fr_1fr_120px] gap-4 px-3 py-2 text-xs text-muted-foreground font-medium border-b border-border">
                  <span>User</span>
                  <span>Email</span>
                  <span>Content</span>
                  <span>Date</span>
                </div>
                {paginatedClicks.map((click, i) => (
                  <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_120px] gap-1 sm:gap-4 px-3 py-2.5 rounded-lg hover:bg-muted/30 transition-colors border-b border-border/30 last:border-0">
                    <span className="text-sm text-foreground font-medium truncate">{click.user_name}</span>
                    <span className="text-xs sm:text-sm text-muted-foreground truncate">{click.user_email}</span>
                    <span className="text-xs sm:text-sm text-foreground truncate">{click.content_title}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(click.clicked_at).toLocaleDateString("pt-BR")} {new Date(click.clicked_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))}
                {totalClickPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t border-border mt-2">
                    <span className="text-xs text-muted-foreground">
                      Page {clicksPage} of {totalClickPages} ({userClicks.length} clicks)
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

        {/* Support Messages */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <MessageCircle className="w-5 h-5 text-secondary" />
              Support Messages
              {supportMessages.length > 0 && (
                <span className="ml-auto text-xs font-normal bg-secondary/20 text-secondary px-2 py-0.5 rounded-full">
                  {supportMessages.length}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {supportMessages.length > 0 ? (
              <div className="space-y-3">
                {supportMessages.map((msg) => (
                  <div key={msg.id} className="p-4 rounded-lg bg-muted/30 border border-border/50 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-sm font-medium text-foreground">{msg.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">{msg.email}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(msg.created_at).toLocaleDateString("pt-BR")} {new Date(msg.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete message?</AlertDialogTitle>
                              <AlertDialogDescription>This will permanently delete this support message.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteSupportMessage(msg.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                    <p className="text-sm text-foreground/80 whitespace-pre-wrap">{msg.message}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8 text-sm">No support messages yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Grant Premium by Email */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Mail className="w-5 h-5 text-secondary" />
              Grant Premium by Email
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 items-end">
              <div className="flex-1 space-y-1.5">
                <label className="text-xs text-muted-foreground">User email</label>
                <Input
                  type="email"
                  placeholder="user@email.com"
                  value={premiumEmail}
                  onChange={(e) => setPremiumEmail(e.target.value)}
                  className="bg-muted border-border"
                />
              </div>
              <Button
                onClick={grantPremiumByEmail}
                disabled={addingPremium}
                className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
              >
                <Crown className="w-4 h-4 mr-1" />
                {addingPremium ? "Granting..." : "Grant Premium"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <CreditCard className="w-5 h-5 text-secondary" />
              Manage Users & Premium
            </CardTitle>
          </CardHeader>
          <CardContent>
            {profiles.length > 0 ? (
              <div className="space-y-1">
                <div className="hidden sm:grid grid-cols-[1fr_120px_80px_80px_50px] gap-4 px-3 py-2 text-xs text-muted-foreground font-medium border-b border-border">
                  <span>User</span>
                  <span>Plan</span>
                  <span>Premium</span>
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
                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${expired ? 'bg-destructive/20 text-destructive' : 'bg-secondary/20 text-secondary'}`}>
                                <Crown className="w-2.5 h-2.5" />
                                {expired ? "EXPIRED" : "PREMIUM"}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground truncate block">{p.email || "No email"}</span>
                        </div>
                        <span className="text-xs text-muted-foreground hidden sm:block">
                          {p.premium_plan === "monthly" ? "Monthly €15.99" : p.premium_plan === "annual" ? "Annual €159.99" : "—"}
                        </span>
                        <div className="hidden sm:block">
                          <Switch
                            checked={p.is_premium}
                            onCheckedChange={(e) => { e; togglePremium(p); }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground hidden sm:block">
                          {new Date(p.created_at).toLocaleDateString("en-US")}
                        </span>
                        <div className="hidden sm:flex justify-center">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button
                                onClick={(e) => e.stopPropagation()}
                                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete user?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete <strong>{p.email || "this user"}</strong> and all their data. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteUser(p)}
                                  disabled={deletingUserId === p.user_id}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  {deletingUserId === p.user_id ? "Deleting..." : "Delete"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                        <div className="sm:hidden flex items-center gap-2">
                          <Switch
                            checked={p.is_premium}
                            onCheckedChange={() => togglePremium(p)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>
                      
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="px-3 pb-4 space-y-3"
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-lg bg-muted/30">
                            <div className="space-y-1.5">
                              <label className="text-xs text-muted-foreground flex items-center gap-1">
                                <CreditCard className="w-3 h-3" /> Plan
                              </label>
                              <Select
                                value={p.premium_plan || "none"}
                                onValueChange={(val) => {
                                  if (val === "none") return;
                                  updatePremiumPlan(p, val);
                                }}
                              >
                                <SelectTrigger className="h-9 text-xs bg-background">
                                  <SelectValue placeholder="Select plan" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">No plan</SelectItem>
                                  <SelectItem value="monthly">Monthly — €15.99</SelectItem>
                                  <SelectItem value="annual">Annual — €159.99</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> Expires at
                              </label>
                              <Input
                                type="date"
                                className="h-9 text-xs bg-background"
                                value={p.premium_expires_at ? new Date(p.premium_expires_at).toISOString().split("T")[0] : ""}
                                onChange={(e) => updateExpirationDate(p, e.target.value)}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs text-muted-foreground">Status</label>
                              <div className={`h-9 flex items-center px-3 rounded-md text-xs font-medium ${
                                !p.is_premium ? 'bg-muted text-muted-foreground' :
                                expired ? 'bg-destructive/10 text-destructive' :
                                'bg-secondary/10 text-secondary'
                              }`}>
                                {!p.is_premium ? "Free" : expired ? "Expired" : `Active until ${new Date(p.premium_expires_at!).toLocaleDateString("en-US")}`}
                              </div>
                            </div>
                          </div>
                          <div className="sm:hidden">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm" className="w-full">
                                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete User
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete user?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete <strong>{p.email || "this user"}</strong> and all their data.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                   <AlertDialogAction
                                     onClick={() => deleteUser(p)}
                                     disabled={deletingUserId === p.user_id}
                                     className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                   >
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
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t border-border mt-2">
                    <span className="text-xs text-muted-foreground">
                      Page {currentPage} of {totalPages} ({profiles.length} users)
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage <= 1}
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage >= totalPages}
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8 text-sm">
                No users registered yet.
              </p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Admin;
