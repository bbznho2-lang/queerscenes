import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { ArrowLeft, Play, Pencil, Crown, Lock, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import EditContentDialog from "@/components/EditContentDialog";
import CommentsSection from "@/components/CommentsSection";

interface ContentItem {
  id: string;
  title: string;
  year: number;
  tag: string;
  type: string;
  banner_url: string | null;
  player_url: string | null;
  player_url_free: string | null;
  player_url_premium: string | null;
  section: string;
  position: number;
  is_premium: boolean;
}

interface Episode {
  id: string;
  content_id: string;
  title: string;
  episode_number: number;
  player_url: string | null;
  player_url_free: string | null;
  player_url_premium: string | null;
  season: number;
  is_premium: boolean;
}

type PlayerTier = "free" | "supporter";

const Player = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const isMobile = useIsMobile();
  const [content, setContent] = useState<ContentItem | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [currentEp, setCurrentEp] = useState<Episode | null>(null);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [editOpen, setEditOpen] = useState(false);
  const [premiumBlocked, setPremiumBlocked] = useState(false);
  const [userIsPremium, setUserIsPremium] = useState(false);
  const [tier, setTier] = useState<PlayerTier>("free");

  const fetchContent = async () => {
    if (!id) return;
    const { data } = await supabase.from("contents").select("*").eq("id", id).single();
    if (data) {
      setContent(data as ContentItem);

      if (data.is_premium) {
        if (authLoading) {
          setPremiumBlocked(true);
          setUserIsPremium(false);
        } else if (isAdmin) {
          setPremiumBlocked(false);
          setUserIsPremium(true);
        } else if (!user) {
          setPremiumBlocked(true);
          setUserIsPremium(false);
        } else {
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("is_premium, premium_expires_at")
            .eq("user_id", user.id)
            .maybeSingle();
          if (profileError) {
            setPremiumBlocked(true);
            setUserIsPremium(false);
          } else {
            const notExpired = !profile?.premium_expires_at || new Date(profile.premium_expires_at) > new Date();
            const hasPremium = !!(profile?.is_premium && notExpired);
            setPremiumBlocked(!hasPremium);
            setUserIsPremium(hasPremium);
          }
        }
      } else {
        setPremiumBlocked(false);
        if (isAdmin) {
          setUserIsPremium(true);
        } else if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("is_premium, premium_expires_at")
            .eq("user_id", user.id)
            .maybeSingle();
          const notExpired = !profile?.premium_expires_at || new Date(profile.premium_expires_at) > new Date();
          setUserIsPremium(!!(profile?.is_premium && notExpired));
        } else {
          setUserIsPremium(false);
        }
      }

      if (data.type === "serie" || data.type === "novela" || data.type === "anime") {
        const { data: eps } = await supabase.from("episodes").select("*").eq("content_id", id).order("season").order("episode_number");
        const normalizedEpisodes = ((eps || []) as Episode[]).map(e => ({ ...e, season: e.season || 1 }));
        setEpisodes(normalizedEpisodes);
        if (normalizedEpisodes.length > 0) {
          setSelectedSeason(normalizedEpisodes[0].season);
          const firstPlayable = normalizedEpisodes.find((ep) => Boolean((ep.player_url_free || ep.player_url_premium || ep.player_url || "").trim()));
          setCurrentEp(firstPlayable || normalizedEpisodes[0]);
        } else {
          setCurrentEp(null);
        }
      } else {
        setEpisodes([]);
        setCurrentEp(null);
      }
    }
  };

  useEffect(() => {
    fetchContent();
  }, [id, user?.id, isAdmin, authLoading]);

  // Auto switch to free if not allowed on supporter
  useEffect(() => {
    if (tier === "supporter" && !userIsPremium && !isAdmin) {
      setTier("free");
    }
  }, [tier, userIsPremium, isAdmin]);

  const episodePremiumBlocked = currentEp?.is_premium && !userIsPremium && !isAdmin;
  const isBlocked = premiumBlocked || episodePremiumBlocked;

  // Resolve URL based on tier with fallback chain
  const sourceFree = currentEp?.player_url_free || content?.player_url_free || currentEp?.player_url || content?.player_url || "";
  const sourcePremium = currentEp?.player_url_premium || content?.player_url_premium || sourceFree;
  const rawPlayerUrl = tier === "supporter" ? sourcePremium : sourceFree;

  const hasPremiumOption = Boolean((currentEp?.player_url_premium || content?.player_url_premium || "").trim());
  const hasFreeOption = Boolean((currentEp?.player_url_free || content?.player_url_free || currentEp?.player_url || content?.player_url || "").trim());

  const getEmbedUrl = (url: string) => {
    const trimmedUrl = url.trim();
    try {
      const parsed = new URL(trimmedUrl);
      if (parsed.hostname.includes("drive.google.com")) {
        const fileFromPath = parsed.pathname.match(/\/file\/d\/([^/]+)/)?.[1];
        const fileFromQuery = parsed.searchParams.get("id");
        const driveFileId = fileFromPath || fileFromQuery;
        if (driveFileId) return `https://drive.google.com/file/d/${driveFileId}/preview`;
      }
      if (parsed.hostname.includes("dailymotion.com")) {
        const videoId = parsed.pathname.match(/\/video\/([a-zA-Z0-9]+)/)?.[1];
        if (videoId) return `https://www.dailymotion.com/embed/video/${videoId}`;
      }
      if (parsed.hostname === "dai.ly") {
        const videoId = parsed.pathname.replace("/", "");
        if (videoId) return `https://www.dailymotion.com/embed/video/${videoId}`;
      }
      if (parsed.hostname.includes("youtube.com") || parsed.hostname === "youtu.be") {
        let videoId = parsed.searchParams.get("v");
        if (!videoId && parsed.hostname === "youtu.be") videoId = parsed.pathname.slice(1);
        if (videoId) return `https://www.youtube.com/embed/${videoId}`;
      }
    } catch { /* fallback */ }
    const driveMatch = trimmedUrl.match(/drive\.google\.com\/file\/d\/([^/]+)/);
    if (driveMatch?.[1]) return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
    const dailymotionMatch = trimmedUrl.match(/dailymotion\.com\/video\/([a-zA-Z0-9]+)/);
    if (dailymotionMatch?.[1]) return `https://www.dailymotion.com/embed/video/${dailymotionMatch[1]}`;
    return trimmedUrl;
  };

  const activePlayerUrl = rawPlayerUrl ? getEmbedUrl(rawPlayerUrl) : "";
  const hasPlayerUrl = Boolean(activePlayerUrl);
  const iframeClassName = "absolute inset-0 w-full h-full border-0";

  const handleSupporterClick = () => {
    if (userIsPremium || isAdmin) {
      setTier("supporter");
    } else {
      navigate("/#planos");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-y-auto">
      <div className={isMobile ? "absolute top-0 left-0 right-0 z-20 flex items-center justify-between gap-3 p-2 pointer-events-none" : "flex items-center justify-between gap-3 p-3 sm:p-6 absolute top-0 left-0 right-0 z-10"}>
        <button
          onClick={() => navigate("/browse")}
          className={isMobile ? "pointer-events-auto w-7 h-7 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center hover:bg-card transition-colors" : "w-9 h-9 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center hover:bg-card transition-colors"}
        >
          <ArrowLeft className={isMobile ? "w-3.5 h-3.5 text-foreground" : "w-5 h-5 text-foreground"} />
        </button>
        {isAdmin && content && (
          <button onClick={() => setEditOpen(true)} className="hidden sm:flex w-9 h-9 rounded-full bg-card flex items-center justify-center hover:bg-primary/20 transition-colors neon-border-purple">
            <Pencil className="w-4 h-4 text-primary" />
          </button>
        )}
      </div>

      <div className={isMobile ? "w-full flex-shrink-0" : "w-full flex-1 flex items-center justify-center px-4 pt-16 pb-4"}>
        <div className={isMobile ? "w-full" : "w-full max-w-5xl"}>
          <div className={isMobile ? "relative w-full aspect-video bg-card overflow-hidden" : "relative aspect-video bg-card rounded-2xl overflow-hidden neon-border-purple"}>
            {isBlocked ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/90 backdrop-blur-sm px-6 text-center">
                <Lock className="w-12 h-12 text-secondary mb-4" />
                <h2 className="text-xl font-bold mb-2 flex items-center gap-2"><Crown className="w-5 h-5 text-secondary" /> Supporter Content</h2>
                <p className="text-muted-foreground text-sm mb-4">This title is exclusive to Supporters.</p>
                <button onClick={() => navigate("/#planos")} className="px-6 py-2.5 rounded-full bg-secondary text-secondary-foreground font-semibold hover:bg-secondary/90 transition-colors">
                  Become a Supporter
                </button>
              </div>
            ) : hasPlayerUrl ? (
              <iframe
                key={`${tier}-${activePlayerUrl}`}
                src={activePlayerUrl}
                title={content?.title ? `Player - ${content.title}` : "Player"}
                className={iframeClassName}
                allowFullScreen
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                loading="eager"
                style={{ border: 0 }}
              />
            ) : (
              <div className="absolute inset-0">
                <img
                  src={content?.banner_url || "/placeholder.svg"}
                  alt={content?.title ? `Cover - ${content.title}` : "Content cover"}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px]" />
                <div className="absolute inset-0 flex items-center justify-center px-4 text-center">
                  <p className="text-sm text-foreground">Video unavailable for this {tier === "supporter" ? "Supporter" : "Free"} player.</p>
                </div>
              </div>
            )}
          </div>

          {/* Player tier selector */}
          {!isBlocked && (hasFreeOption || hasPremiumOption) && (
            <div className="mt-3 sm:mt-4 px-3 sm:px-0">
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  onClick={() => setTier("free")}
                  className={`flex-1 rounded-xl border px-3 py-2.5 text-left transition-all ${
                    tier === "free"
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    🌈 Free Player
                    {tier === "free" && <Play className="w-3 h-3 text-primary" />}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Watch for free with ads</p>
                </button>
                <button
                  onClick={handleSupporterClick}
                  className={`flex-1 rounded-xl border px-3 py-2.5 text-left transition-all relative ${
                    tier === "supporter"
                      ? "border-primary bg-primary/15 text-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Crown className="w-3.5 h-3.5 text-primary" />
                    Supporter Player
                    {!(userIsPremium || isAdmin) && <Lock className="w-3 h-3 text-muted-foreground ml-auto" />}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {userIsPremium || isAdmin ? "Ad-free, exclusive for Supporters" : "Become a Supporter to unlock"}
                  </p>
                </button>
              </div>
              {!hasPremiumOption && (userIsPremium || isAdmin) && (
                <p className="text-[11px] text-muted-foreground/70 mt-2 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> No Supporter version yet — playing the Free version.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="w-full max-w-5xl mx-auto px-4 sm:px-0 pb-8">
        <div className="mt-4 sm:mt-6">
          <h1 className="text-lg sm:text-2xl font-bold">{content?.title || "Loading..."}</h1>
          <div className="flex flex-wrap gap-2 mt-2 sm:mt-3">
            <span className="px-2 py-0.5 text-xs rounded bg-primary/20 text-primary">{content?.tag}</span>
            <span className="px-2 py-0.5 text-xs rounded bg-secondary/20 text-secondary">{content?.year}</span>
            <span className="px-2 py-0.5 text-xs rounded bg-muted text-muted-foreground">{content?.type === "serie" ? "Series" : content?.type === "novela" ? "Soap Opera" : "Movie"}</span>
          </div>
        </div>

        {(content as any)?.synopsis && (
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{(content as any).synopsis}</p>
        )}

        {(content?.type === "serie" || content?.type === "novela" || content?.type === "anime") && episodes.length > 0 && (() => {
          const seasons = [...new Set(episodes.map(e => e.season))].sort((a, b) => a - b);
          const filteredEps = episodes.filter(e => e.season === selectedSeason);
          return (
            <div className="mt-6 sm:mt-8 space-y-3">
              <h3 className="text-lg font-semibold">Episodes</h3>
              {seasons.length > 1 && (
                <div className="flex gap-2 flex-wrap">
                  {seasons.map(s => (
                    <button
                      key={s}
                      onClick={() => setSelectedSeason(s)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                        selectedSeason === s
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      Season {s}
                    </button>
                  ))}
                </div>
              )}
              <p className="text-sm font-semibold text-primary">Season {selectedSeason}</p>
              <div className="space-y-2">
                {filteredEps.map((ep) => (
                  <button
                    key={ep.id}
                    onClick={async () => {
                      setCurrentEp(ep);
                      if (user && content) {
                        await supabase.from("content_clicks").insert({ content_id: content.id, user_id: user.id, episode_id: ep.id } as any);
                      }
                    }}
                    className={`w-full text-left rounded-xl flex items-center transition-colors ${isMobile ? "px-3 py-2.5 gap-2.5" : "px-4 py-3 gap-3"} ${
                      currentEp?.id === ep.id ? "bg-primary/10 border border-primary/30" : "bg-card border border-border hover:border-primary/20"
                    }`}
                  >
                    <span className={isMobile ? "w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[11px] font-bold text-foreground" : "w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-foreground"}>{ep.episode_number}</span>
                    <span className={isMobile ? "text-xs text-foreground" : "text-sm text-foreground"}>{ep.title}</span>
                    {ep.is_premium && (
                      <Crown className="w-3 h-3 text-secondary flex-shrink-0" />
                    )}
                    {currentEp?.id === ep.id && <Play className={isMobile ? "w-3 h-3 text-primary ml-auto" : "w-3 h-3 text-primary ml-auto"} />}
                  </button>
                ))}
              </div>
            </div>
          );
        })()}

        {content && <CommentsSection contentId={content.id} />}
      </div>

      {content && <EditContentDialog open={editOpen} onOpenChange={setEditOpen} content={content} onSaved={fetchContent} />}
    </div>
  );
};

export default Player;
