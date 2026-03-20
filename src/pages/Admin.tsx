import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Users, BarChart3, Crown, Mail, Eye, Calendar, CreditCard, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
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
  const [loadingData, setLoadingData] = useState(true);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [premiumEmail, setPremiumEmail] = useState("");
  const [addingPremium, setAddingPremium] = useState(false);

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
    setProfiles((profilesData as Profile[]) || []);

    const { data: clicks } = await supabase
      .from("content_clicks")
      .select("content_id");

    if (clicks && clicks.length > 0) {
      const countMap: Record<string, number> = {};
      clicks.forEach((c: any) => {
        countMap[c.content_id] = (countMap[c.content_id] || 0) + 1;
      });
      const contentIds = Object.keys(countMap);
      const { data: contents } = await supabase
        .from("contents")
        .select("id, title")
        .in("id", contentIds);

      const stats: ClickStat[] = (contents || [])
        .map((c: any) => ({
          title: c.title.length > 15 ? c.title.slice(0, 15) + "…" : c.title,
          clicks: countMap[c.id] || 0,
        }))
        .sort((a: ClickStat, b: ClickStat) => b.clicks - a.clicks)
        .slice(0, 10);

      setClickStats(stats);
    }
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
                <div className="hidden sm:grid grid-cols-[1fr_120px_80px_80px] gap-4 px-3 py-2 text-xs text-muted-foreground font-medium border-b border-border">
                  <span>User</span>
                  <span>Plan</span>
                  <span>Premium</span>
                  <span>Date</span>
                </div>
                {profiles.map((p) => {
                  const expired = isExpired(p.premium_expires_at);
                  const isExpanded = expandedUser === p.id;
                  return (
                    <div key={p.id} className="border-b border-border/50 last:border-0">
                      <div
                        className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_120px_80px_80px] gap-3 sm:gap-4 items-center px-3 py-3 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer"
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
                        </motion.div>
                      )}
                    </div>
                  );
                })}
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
