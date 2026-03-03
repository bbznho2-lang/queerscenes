import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Users, BarChart3, Crown, Mail, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
  is_premium: boolean;
  created_at: string;
}

interface ClickStat {
  title: string;
  clicks: number;
}

const Admin = () => {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [clickStats, setClickStats] = useState<ClickStat[]>([]);
  const [loadingData, setLoadingData] = useState(true);

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

    // Fetch profiles
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    setProfiles(profilesData || []);

    // Fetch click stats - get clicks with content titles
    const { data: clicks } = await supabase
      .from("content_clicks")
      .select("content_id");

    if (clicks && clicks.length > 0) {
      // Count clicks per content
      const countMap: Record<string, number> = {};
      clicks.forEach((c: any) => {
        countMap[c.content_id] = (countMap[c.content_id] || 0) + 1;
      });

      // Get content titles
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
    const { error } = await supabase
      .from("profiles")
      .update({ is_premium: !profile.is_premium })
      .eq("id", profile.id);
    if (error) {
      toast.error("Erro ao atualizar");
      return;
    }
    toast.success(
      profile.is_premium ? "Premium removido" : "Premium ativado"
    );
    setProfiles(
      profiles.map((p) =>
        p.id === profile.id ? { ...p, is_premium: !p.is_premium } : p
      )
    );
  };

  const chartConfig = {
    clicks: {
      label: "Cliques",
      color: "hsl(var(--primary))",
    },
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  const totalUsers = profiles.length;
  const premiumUsers = profiles.filter((p) => p.is_premium).length;
  const totalClicks = clickStats.reduce((a, b) => a + b.clicks, 0);

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
            Painel Admin
          </h1>
        </div>
      </header>

      <main className="pt-20 px-4 pb-12 max-w-7xl mx-auto space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="bg-card border-border">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{totalUsers}</p>
                  <p className="text-xs text-muted-foreground">Usuários totais</p>
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
                  <p className="text-xs text-muted-foreground">Usuários premium</p>
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
                  <p className="text-xs text-muted-foreground">Cliques totais</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Chart */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <BarChart3 className="w-5 h-5 text-primary" />
              Conteúdos Mais Clicados
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
                Nenhum clique registrado ainda. Os dados aparecerão quando os usuários clicarem nos conteúdos.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Mail className="w-5 h-5 text-secondary" />
              Gerenciar Usuários
            </CardTitle>
          </CardHeader>
          <CardContent>
            {profiles.length > 0 ? (
              <div className="space-y-2">
                <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-3 py-2 text-xs text-muted-foreground font-medium border-b border-border">
                  <span>E-mail</span>
                  <span>Premium</span>
                  <span>Data</span>
                </div>
                {profiles.map((p) => (
                  <div
                    key={p.id}
                    className="grid grid-cols-[1fr_auto_auto] gap-4 items-center px-3 py-3 rounded-lg hover:bg-muted/30 transition-colors"
                  >
                    <span className="text-sm text-foreground truncate">
                      {p.email || "Sem e-mail"}
                    </span>
                    <Switch
                      checked={p.is_premium}
                      onCheckedChange={() => togglePremium(p)}
                    />
                    <span className="text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8 text-sm">
                Nenhum usuário registrado ainda.
              </p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Admin;
