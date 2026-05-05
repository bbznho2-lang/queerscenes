import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { ArrowLeft, Play, Pencil, Crown, Lock, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import EditContentDialog from "@/components/EditContentDialog";
import CommentsSection from "@/components/CommentsSection";
import { trackSupporterEvent, type SupporterEventType } from "@/lib/supporter-tracking";


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
  supporter_player_enabled?: boolean;
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
  const { toast } = useToast();
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupFirstName, setSignupFirstName] = useState("");
  const [signupSubmitting, setSignupSubmitting] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [viewportWidth, setViewportWidth] = useState<number>(typeof window !== "undefined" ? window.innerWidth : 1440);


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

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Note: previously auto-switched supporter→free for non-supporters; now we
  // keep the tier and show an in-player paywall so the user can convert.

  const supporterPlayerEnabled = Boolean(content?.supporter_player_enabled);
  const episodePremiumBlocked = currentEp?.is_premium && !userIsPremium && !isAdmin;
  const supporterPaywall = supporterPlayerEnabled && tier === "supporter" && !userIsPremium && !isAdmin;
  const isBlocked = premiumBlocked || episodePremiumBlocked || supporterPaywall;

  // Resolve URL based on tier with fallback chain
  const sourceFree = currentEp?.player_url_free || content?.player_url_free || currentEp?.player_url || content?.player_url || "";
  const sourcePremium = currentEp?.player_url_premium || content?.player_url_premium || sourceFree;
  const rawPlayerUrl = tier === "supporter" && supporterPlayerEnabled ? sourcePremium : sourceFree;

  const hasPremiumOption = supporterPlayerEnabled && Boolean((currentEp?.player_url_premium || content?.player_url_premium || "").trim());
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
  const isGoogleDriveEmbed = activePlayerUrl.includes("drive.google.com");
  const googleDriveClipPath = useMemo(() => {
    if (viewportWidth < 768) return "inset(2px 0 2px 0)";
    if (viewportWidth < 1024) return "inset(1px 0 1px 0)";
    return "inset(0 0 0 0)";
  }, [viewportWidth]);
  const iframeClassName = isGoogleDriveEmbed
    ? "absolute inset-0 block h-full w-full border-0"
    : "absolute inset-0 block h-full w-full border-0";
  const iframeStyle: React.CSSProperties = isGoogleDriveEmbed
    ? { border: 0, backgroundColor: "#000", display: "block", clipPath: googleDriveClipPath }
    : { border: 0, backgroundColor: "transparent", display: "block" };

  const trackEvent = (event_type: SupporterEventType, source: string, extra?: Record<string, unknown>) =>
    trackSupporterEvent(supabase, {
      event_type,
      source,
      user_id: user?.id ?? null,
      content_id: content?.id ?? null,
      metadata: { tier, episode_id: currentEp?.id ?? null, ...(extra || {}) },
    });

  const handleSupporterClick = () => {
    setTier("supporter");
    void trackEvent("supporter_player_click", "player_tier_selector");
  };

  const goToPlans = (source: string) => {
    void trackEvent("become_supporter_click", source);
    navigate("/#planos");
  };

  const handleSupporterSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signupSubmitting) return;
    setSignupSubmitting(true);
    void trackEvent("paywall_signup_submit", "paywall_inline_form");
    const { error } = await supabase.auth.signUp({
      email: signupEmail.trim(),
      password: signupPassword,
      options: {
        emailRedirectTo: `${window.location.origin}/player/${id}`,
        data: { first_name: signupFirstName.trim() },
      },
    });
    setSignupSubmitting(false);
    if (error) {
      toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
      return;
    }
    setSignupSuccess(true);
    toast({ title: "Account created!", description: "Now choose a Supporter plan to unlock the content." });
  };


  // Track when user lands on locked content / paywall
  useEffect(() => {
    if (!content) return;
    if (premiumBlocked) {
      void trackEvent("locked_content_view", "premium_content");
    } else if (supporterPaywall) {
      void trackEvent("paywall_view", "supporter_player");
    } else if (episodePremiumBlocked) {
      void trackEvent("locked_content_view", "premium_episode");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content?.id, premiumBlocked, supporterPaywall, episodePremiumBlocked, currentEp?.id]);

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

      {isBlocked ? (
        <div className="w-full">
          <div className="relative w-full overflow-hidden sm:max-w-3xl sm:mx-auto sm:mt-16 sm:rounded-2xl sm:neon-border-purple bg-card">
            {content?.banner_url && (
              <img src={content.banner_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-25" />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/95 to-background" />
            <div className="relative z-10 flex flex-col items-center px-5 py-8 sm:py-10 text-center">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 text-primary px-3 py-1 text-[11px] font-bold uppercase tracking-wider mb-3">
                <Crown className="w-3.5 h-3.5" /> Supporter
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold mb-1.5">
                {supporterPaywall ? "Unlock the Supporter player" : "Become a Supporter to watch"}
              </h2>
              <p className="text-muted-foreground text-xs sm:text-sm mb-5 max-w-md">
                Support the project and get instant access to ad-free playback, exclusive titles and early releases.
              </p>

              <div className="grid grid-cols-3 gap-2 sm:gap-3 max-w-md w-full mb-5">
                {[
                  { icon: "⚡", title: "Early access" },
                  { icon: "🔓", title: "Exclusives" },
                  { icon: "♾️", title: "Unlimited" },
                ].map((perk) => (
                  <div key={perk.title} className="rounded-lg bg-card/70 border border-border px-2 py-3 text-center backdrop-blur-sm">
                    <div className="text-lg leading-none mb-1">{perk.icon}</div>
                    <div className="text-[11px] sm:text-xs font-semibold text-foreground leading-tight">{perk.title}</div>
                  </div>
                ))}
              </div>

              {!user && !signupSuccess && (
                <form onSubmit={handleSupporterSignup} className="w-full max-w-sm space-y-2 mb-3 text-left" aria-label="Supporter signup">
                  <input
                    type="text"
                    placeholder="Your first name"
                    value={signupFirstName}
                    onChange={(e) => setSignupFirstName(e.target.value)}
                    className="w-full rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-primary"
                    required
                    maxLength={50}
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    className="w-full rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-primary"
                    required
                    maxLength={255}
                  />
                  <input
                    type="password"
                    placeholder="Password (min 6 chars)"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    className="w-full rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-primary"
                    required
                    minLength={6}
                    maxLength={72}
                  />
                  <button
                    type="submit"
                    onClick={() => void trackEvent("paywall_signup_click", "paywall_inline_form")}
                    disabled={signupSubmitting}
                    className="shine-cta w-full rounded-full bg-primary text-primary-foreground font-semibold py-2.5 text-sm flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-60 glow-purple"
                  >
                    {signupSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crown className="w-4 h-4" />}
                    Become a Supporter
                  </button>
                </form>
              )}

              {!user && signupSuccess && (
                <div className="w-full max-w-sm rounded-lg bg-primary/10 border border-primary/30 px-3 py-3 mb-3 text-xs text-foreground">
                  Check your email to confirm, then choose a Supporter plan to unlock this content.
                </div>
              )}

              {user && (
                <button
                  onClick={() => goToPlans(supporterPaywall ? "paywall_supporter_player" : "paywall_premium_content")}
                  className="shine-cta w-full max-w-sm rounded-full bg-primary text-primary-foreground font-semibold py-2.5 text-sm flex items-center justify-center gap-2 hover:bg-primary/90 mb-3 glow-purple"
                >
                  <Crown className="w-4 h-4" /> Choose your Supporter plan
                </button>
              )}

              {!user && (
                <button
                  onClick={() => goToPlans(supporterPaywall ? "paywall_supporter_player" : "paywall_premium_content")}
                  className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                >
                  Already have an account? Choose a plan
                </button>
              )}

              {supporterPaywall && hasFreeOption && (
                <button onClick={() => { void trackEvent("watch_free_fallback_click", "paywall"); setTier("free"); }} className="mt-2 text-xs text-muted-foreground hover:text-foreground underline underline-offset-2">
                  Watch the free version
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
      <div className={isMobile ? "w-full flex-shrink-0" : "w-full flex-1 flex items-center justify-center px-4 pt-16 pb-4"}>
        <div className={isMobile ? "w-full" : "w-full max-w-5xl"}>
          <div className={isMobile ? "relative w-full aspect-video overflow-hidden bg-black" : "relative aspect-video overflow-hidden rounded-2xl bg-black neon-border-purple"}>
            {hasPlayerUrl ? (
              <iframe
                key={`${tier}-${activePlayerUrl}`}
                src={activePlayerUrl}
                title={content?.title ? `Player - ${content.title}` : "Player"}
                className={iframeClassName}
                scrolling="no"
                allowFullScreen
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                loading="eager"
                referrerPolicy="strict-origin-when-cross-origin"
                style={iframeStyle}
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
          {(!isBlocked || supporterPaywall) && (hasFreeOption || hasPremiumOption) && (
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
      )}


      {!isBlocked && (
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


        {!premiumBlocked && (content?.type === "serie" || content?.type === "novela" || content?.type === "anime") && episodes.length > 0 && (() => {
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

        {content && !premiumBlocked && <CommentsSection contentId={content.id} />}
      </div>
      )}


      {content && <EditContentDialog open={editOpen} onOpenChange={setEditOpen} content={content} onSaved={fetchContent} />}
    </div>
  );
};

export default Player;
