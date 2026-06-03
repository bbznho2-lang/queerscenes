import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Play, Pencil, Crown, Lock, Sparkles, Loader2, Maximize, ExternalLink } from "lucide-react";
import DOMPurify from "dompurify";
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
  player_url?: string | null;
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
  player_url?: string | null;
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
  const [userExpired, setUserExpired] = useState(false);
  const [userExpiredAt, setUserExpiredAt] = useState<string | null>(null);
  const [tier, setTier] = useState<PlayerTier>("free");
  const { toast } = useToast();
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupFirstName, setSignupFirstName] = useState("");
  const [signupSubmitting, setSignupSubmitting] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);


  const fetchContent = async () => {
    if (!id) return;
    if (authLoading) return; // wait for auth to settle to avoid double-fetch
    const contentPromise = supabase
      .from("contents")
      .select("id, title, year, tag, type, banner_url, section, position, is_premium, supporter_player_enabled, synopsis")
      .eq("id", id)
      .single();
    const profilePromise = user
      ? supabase
          .from("profiles")
          .select("is_premium, premium_expires_at")
          .eq("user_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null } as any);

    const [{ data }, { data: profile, error: profileError }] = await Promise.all([
      contentPromise,
      profilePromise,
    ]);
    if (!data) return;
    setContent(data as ContentItem);

    const notExpired = !profile?.premium_expires_at || new Date(profile.premium_expires_at) > new Date();
    const hasPremium = !!(profile?.is_premium && notExpired);
    const expired = !!(profile?.is_premium && profile?.premium_expires_at && new Date(profile.premium_expires_at) <= new Date());

    if (data.is_premium) {
      if (isAdmin) {
        setPremiumBlocked(false);
        setUserIsPremium(true);
      } else if (!user) {
        setPremiumBlocked(true);
        setUserIsPremium(false);
      } else if (profileError) {
        setPremiumBlocked(true);
        setUserIsPremium(false);
        setUserExpired(false);
        setUserExpiredAt(null);
      } else {
        setPremiumBlocked(!hasPremium);
        setUserIsPremium(hasPremium);
        setUserExpired(expired);
        setUserExpiredAt(expired ? profile!.premium_expires_at : null);
      }
    } else {
      setPremiumBlocked(false);
      if (isAdmin) {
        setUserIsPremium(true);
        setUserExpired(false);
      } else if (user) {
        setUserIsPremium(hasPremium);
        setUserExpired(expired);
        setUserExpiredAt(expired ? profile!.premium_expires_at : null);
      } else {
        setUserIsPremium(false);
        setUserExpired(false);
        setUserExpiredAt(null);
      }
    }

    if (data.type === "serie" || data.type === "novela" || data.type === "anime") {
      const { data: eps } = await supabase
        .from("episodes")
        .select("id, content_id, title, episode_number, season, is_premium, created_at")
        .eq("content_id", id)
        .order("season")
        .order("episode_number");
      const normalizedEpisodes = ((eps || []) as Episode[]).map(e => ({ ...e, season: e.season || 1 }));
      setEpisodes(normalizedEpisodes);
      if (normalizedEpisodes.length > 0) {
        setSelectedSeason(normalizedEpisodes[0].season);
        setCurrentEp(normalizedEpisodes[0]);
      } else {
        setCurrentEp(null);
      }
    } else {
      setEpisodes([]);
      setCurrentEp(null);
    }
  };

  useEffect(() => {
    fetchContent();
  }, [id, user?.id, isAdmin, authLoading]);


  const episodePremiumBlocked = currentEp?.is_premium && !userIsPremium && !isAdmin;
  const isBlocked = premiumBlocked || episodePremiumBlocked;

  type EpisodeLink = { title: string; type: "embed" | "redirect"; url: string };
  const [episodeLinks, setEpisodeLinks] = useState<EpisodeLink[]>([]);
  const [selectedLinkIdx, setSelectedLinkIdx] = useState(-1);
  const [rawPlayerUrl, setRawPlayerUrl] = useState("");

  useEffect(() => {
    let cancelled = false;
    const resolve = async () => {
      if (isBlocked) { setEpisodeLinks([]); setRawPlayerUrl(""); setSelectedLinkIdx(-1); return; }
      if (currentEp?.id) {
        const { data } = await (supabase.rpc as any)("get_episode_links", { _episode_id: currentEp.id });
        const links = Array.isArray(data) ? (data as EpisodeLink[]) : [];
        if (cancelled) return;
        if (links.length > 0) {
          setEpisodeLinks(links);
        } else {
          const { data: legacy } = await supabase.rpc("get_episode_player_url", { _episode_id: currentEp.id });
          const url = (legacy as string | null) || "";
          if (cancelled) return;
          setEpisodeLinks(url ? [{ title: "Watch on site", type: "embed", url }] : []);
        }
        setSelectedLinkIdx(-1);
        setRawPlayerUrl("");
      } else if (content?.id) {
        const { data } = await (supabase.rpc as any)("get_content_links", { _content_id: content.id });
        const links = Array.isArray(data) ? (data as EpisodeLink[]) : [];
        if (cancelled) return;
        if (links.length > 0) {
          setEpisodeLinks(links);
        } else {
          const { data: legacy } = await supabase.rpc("get_content_player_url", { _content_id: content.id });
          const url = (legacy as string | null) || "";
          if (cancelled) return;
          setEpisodeLinks(url ? [{ title: "Watch on site", type: "embed", url }] : []);
        }
        setSelectedLinkIdx(-1);
        setRawPlayerUrl("");
      } else {
        setEpisodeLinks([]);
        setSelectedLinkIdx(-1);
        setRawPlayerUrl("");
      }

    };
    void resolve();
    return () => { cancelled = true; };
  }, [currentEp?.id, content?.id, isBlocked, userIsPremium, isAdmin]);

  const selectLink = (idx: number) => {
    const lnk = episodeLinks[idx];
    if (!lnk) return;
    setSelectedLinkIdx(idx);
    if (lnk.type === "embed") {
      setRawPlayerUrl(lnk.url);
    } else {
      setRawPlayerUrl("");
    }
  };

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

  const isIframeHtml = rawPlayerUrl.trim().toLowerCase().startsWith("<iframe");
  const activePlayerUrl = rawPlayerUrl && !isIframeHtml ? getEmbedUrl(rawPlayerUrl) : "";
  const hasPlayerUrl = Boolean(activePlayerUrl) || isIframeHtml;
  const isOdyseePlayer = rawPlayerUrl.toLowerCase().includes("odysee.com");
  const playerWrapperRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const handleRequestFullscreen = () => {
    const target =
      iframeRef.current ||
      (playerWrapperRef.current?.querySelector("iframe") as HTMLIFrameElement | null);
    if (!target) return;
    const anyTarget = target as any;
    if (target.requestFullscreen) target.requestFullscreen().catch(() => {});
    else if (anyTarget.webkitRequestFullscreen) anyTarget.webkitRequestFullscreen();
    else if (anyTarget.webkitEnterFullscreen) anyTarget.webkitEnterFullscreen();
  };
  const isGoogleDriveEmbed = activePlayerUrl.includes("drive.google.com");
  const playerPaddingBottom = "75%";
  const iframeClassName = isGoogleDriveEmbed
    ? "absolute inset-0 block h-full w-full border-0"
    : "absolute inset-0 block h-full w-full border-0";
  const iframeStyle: React.CSSProperties = isGoogleDriveEmbed
    ? { border: 0, backgroundColor: "transparent", display: "block" }
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
    } else if (episodePremiumBlocked) {
      void trackEvent("locked_content_view", "premium_episode");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content?.id, premiumBlocked, episodePremiumBlocked, currentEp?.id]);

  const playerTierSelector = null;

  return (
    <div className="min-h-screen bg-background flex flex-col min-h-0 overflow-y-auto">
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

      {isBlocked && !userIsPremium && !isAdmin ? (
        <div className="w-full">
          <div className="relative w-full overflow-hidden sm:max-w-3xl sm:mx-auto sm:mt-16 sm:rounded-2xl sm:neon-border-purple bg-card">
            {content?.banner_url && (
              <img src={content.banner_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-25" />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/95 to-background" />
            <div className="relative z-10 flex flex-col items-center px-5 py-8 sm:py-10 text-center">
              {userExpired ? (
                <>
                  <div className="text-5xl sm:text-6xl mb-2 leading-none" aria-hidden>😢</div>
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-destructive/15 text-destructive px-3 py-1 text-[11px] font-bold uppercase tracking-wider mb-3">
                    <Crown className="w-3.5 h-3.5" /> Supporter expired
                  </div>
                  <h2 className="text-xl sm:text-2xl font-extrabold mb-1.5">
                    Your Supporter plan has expired
                  </h2>
                  {userExpiredAt && (
                    <p className="text-[11px] text-muted-foreground mb-2">
                      Expired on {new Date(userExpiredAt!).toLocaleDateString("en-US")}
                    </p>
                  )}
                  <div className="flex items-start gap-2 max-w-md mx-auto mb-5 rounded-lg bg-primary/10 border border-primary/30 px-3 py-2.5 text-left">
                    <span className="text-xl leading-none" aria-hidden>😊</span>
                    <p className="text-xs sm:text-sm text-foreground">
                      Don't worry! Renew your plan to keep watching from where you stopped and unlock all the new updates.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 text-primary px-3 py-1 text-[11px] font-bold uppercase tracking-wider mb-3">
                    <Crown className="w-3.5 h-3.5" /> Supporters only
                  </div>
                  <h2 className="text-xl sm:text-2xl font-extrabold mb-1.5">
                    {currentEp ? `“${currentEp.title}” is waiting for you` : `“${content?.title ?? "This title"}” is waiting for you`}
                  </h2>

                  {(() => {
                    const names = [
                      // US (female)
                      "Ashley", "Madison", "Brittany", "Hannah", "Megan", "Taylor", "Jessica", "Courtney", "Kayla", "Rachel", "Emily",
                      // Arab (female)
                      "Layla", "Fatima", "Yasmin", "Aisha", "Noor", "Salma", "Mariam", "Zahra", "Amira", "Huda", "Lina",
                      // French (female)
                      "Camille", "Léa", "Manon", "Chloé", "Inès", "Juliette",
                      // German (female)
                      "Lena", "Hanna", "Lara", "Greta", "Mila",
                      // Swiss (female)
                      "Elin", "Anouk", "Noemi", "Alina",
                      // Male sprinkle (US / Arab / FR / DE / CH)
                      "Jackson", "Tyler", "Omar", "Khalid", "Lucas", "Felix", "Matthias",
                    ];
                    const seed = (content?.id || "x").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
                    const bucket = Math.floor(Date.now() / (90 * 1000));
                    // Use a step coprime with names.length so the sequence cycles through every name before repeating
                    const step = 17;
                    const idxA = ((seed + bucket * step) % names.length + names.length) % names.length;
                    let idxB = ((seed + bucket * step + 13) % names.length + names.length) % names.length;
                    if (idxB === idxA) idxB = (idxB + 1) % names.length;
                    const a = names[idxA];
                    const b = names[idxB];
                    const others = 29;
                    return (
                      <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/15 border border-green-500/40 text-green-400 px-2.5 py-1 text-[11px] font-semibold">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
                          </span>
                          {a}, {b} and {others} others became Supporters this month
                        </span>
                      </div>
                    );
                  })()}

                  <p className="text-foreground/90 text-xs sm:text-sm mb-5 max-w-md">
                    Don't stop now — the next scene is just one click away. Join our Supporters and pick up exactly where you left off.
                  </p>
                </>
              )}

              <div className="grid grid-cols-3 gap-2 sm:gap-3 max-w-md w-full mb-5">
                {[
                  { icon: "▶️", title: "Keep watching" },
                  { icon: "🔥", title: "Full catalog" },
                  { icon: "⚡", title: "Instant access" },
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
                  onClick={() => goToPlans("paywall_premium_content")}
                  className="shine-cta w-full max-w-sm rounded-full bg-primary text-primary-foreground font-semibold py-2.5 text-sm flex items-center justify-center gap-2 hover:bg-primary/90 mb-3 glow-purple"
                >
                  <Crown className="w-4 h-4" /> {userExpired ? "Renew my Supporter plan" : "Yes, I want to become a Supporter"}
                </button>
              )}

              {!user && (
                <button
                  onClick={() => goToPlans("paywall_premium_content")}
                  className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                >
                  Already have an account? Choose a plan
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
      <div className={isMobile ? "w-full flex-shrink-0 min-h-0 pt-[calc(env(safe-area-inset-top)+20px)]" : "w-full flex-1 flex flex-col items-center px-4 pt-16 pb-4 min-h-0"}>
        <div className={isMobile ? "w-full min-h-0" : "w-full max-w-5xl min-h-0"}>
          {(() => {
            const currentLink = selectedLinkIdx >= 0 ? episodeLinks[selectedLinkIdx] : null;
            const showIframe = currentLink?.type === "embed" && hasPlayerUrl;
            const pad2 = (n: number) => String(n).padStart(2, "0");
            const headingMain = currentEp && content
              ? `${content.title}: ${currentEp.season}x${pad2(currentEp.episode_number)}`
              : (content?.title || "");
            const headingSub = currentEp
              ? (currentEp.title || `Episode ${currentEp.episode_number}`)
              : "";

            return (
              <>
                {content && (
                  <div className={isMobile ? "px-3 pt-2 pb-3" : "pb-3"}>
                    <h1 className="text-xl sm:text-3xl font-bold text-foreground">
                      {headingMain}
                    </h1>
                    {headingSub && (
                      <p className="text-sm sm:text-base text-muted-foreground mt-1">
                        {headingSub}
                      </p>
                    )}
                  </div>
                )}

                {showIframe && (
                  <div
                    className={isMobile ? "relative w-full overflow-hidden bg-black" : "relative w-full overflow-hidden rounded-2xl bg-black neon-border-purple"}
                    style={{ position: "relative", width: "100%", paddingBottom: playerPaddingBottom, height: 0, minHeight: 0, overflow: "hidden" }}
                    ref={playerWrapperRef}
                  >
                    {isIframeHtml ? (
                      <div
                        key={`${tier}-iframe-html-${selectedLinkIdx}`}
                        className="absolute inset-0 [&>iframe]:absolute [&>iframe]:inset-0 [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:border-0"
                        dangerouslySetInnerHTML={{
                          __html: DOMPurify.sanitize(rawPlayerUrl, {
                            ALLOWED_TAGS: ["iframe"],
                            ALLOWED_ATTR: ["src", "allow", "allowfullscreen", "width", "height", "frameborder", "referrerpolicy", "title", "loading", "sandbox"],
                            ADD_ATTR: ["allowfullscreen"],
                          }),
                        }}
                      />
                    ) : (
                      <iframe
                        key={`${tier}-${activePlayerUrl}-${selectedLinkIdx}`}
                        ref={iframeRef}
                        src={activePlayerUrl}
                        title={content?.title ? `Player - ${content.title}` : "Player"}
                        className={iframeClassName}
                        allowFullScreen
                        {...({ webkitallowfullscreen: "true", mozallowfullscreen: "true", "webkit-playsinline": "true" } as any)}
                        allow="fullscreen; accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share"
                        loading="eager"
                        referrerPolicy="strict-origin-when-cross-origin"
                        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none", backgroundColor: "transparent", display: "block" }}
                      />
                    )}
                    {isOdyseePlayer && (
                      <button
                        type="button"
                        onClick={handleRequestFullscreen}
                        aria-label="Enter fullscreen"
                        className="absolute bottom-2 right-2 z-10 rounded-full bg-black/60 hover:bg-black/80 text-white p-2 backdrop-blur-sm border border-white/20"
                      >
                        <Maximize className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}

                {episodeLinks.length > 0 ? (
                  <div className={isMobile ? "mt-4 px-3" : "mt-5"}>
                    <h3 className="text-base font-semibold text-foreground mb-3 pb-2 border-b border-border">
                      Links
                    </h3>
                    <ul className="divide-y divide-border/60">
                      {episodeLinks.map((lnk, idx) => {
                        const isActive = lnk.type === "embed" && idx === selectedLinkIdx && showIframe;
                        if (lnk.type === "embed") {
                          return (
                            <li key={idx}>
                              <button
                                type="button"
                                onClick={() => selectLink(idx)}
                                className={`w-full flex items-center gap-3 py-3 text-left transition-colors ${
                                  isActive ? "text-primary" : "text-foreground hover:text-primary"
                                }`}
                              >
                                <Play className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                                <span className={`text-sm sm:text-base ${isActive ? "font-semibold" : ""}`}>
                                  {lnk.title || "Watch on site"}
                                </span>
                                {isActive && (
                                  <span className="ml-auto text-[10px] uppercase tracking-wider text-primary font-bold">
                                    Playing
                                  </span>
                                )}
                              </button>
                            </li>
                          );
                        }
                        return (
                          <li key={idx}>
                            <a
                              href={lnk.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full flex items-center gap-3 py-3 text-foreground hover:text-primary transition-colors"
                            >
                              <ExternalLink className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                              <span className="text-sm sm:text-base">
                                {lnk.title || "External link"}
                              </span>
                            </a>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : (
                  <div className={isMobile ? "mt-4 px-3" : "mt-5"}>
                    <p className="text-sm text-muted-foreground">No links available for this {currentEp ? "episode" : "title"} yet.</p>
                  </div>
                )}

                {playerTierSelector}
              </>
            );
          })()}
        </div>
      </div>
      )}


      {!isBlocked && (
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-0 pb-8">
        <div className="mt-4 sm:mt-6">
          <div className="flex flex-wrap gap-2">
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
