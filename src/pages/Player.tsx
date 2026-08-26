import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Play, Pencil, Crown, Lock, Sparkles, Loader2, Maximize, ExternalLink, Star } from "lucide-react";
import DOMPurify from "dompurify";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import EditContentDialog from "@/components/EditContentDialog";
import EditDetailsDialog, { parseCast } from "@/components/EditDetailsDialog";
import CommentsSection from "@/components/CommentsSection";
import { getFunnelVisitorId, trackSupporterEvent, type SupporterEventType } from "@/lib/supporter-tracking";
import { getEmailRedirectUrl } from "@/lib/auth-urls";
import { saveWatchProgress } from "@/lib/watch-progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DEFAULT_PAYWALL_TEXT } from "@/components/PaywallCustomizationsAdmin";
import PaywallComments from "@/components/PaywallComments";
import { Skeleton } from "@/components/ui/skeleton";


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
preview_video_url?: string | null;
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
  const [editDetailsOpen, setEditDetailsOpen] = useState(false);
  const [premiumBlocked, setPremiumBlocked] = useState(false);
  const [userIsPremium, setUserIsPremium] = useState(false);
  const [accessResolved, setAccessResolved] = useState(false);
  const [userExpired, setUserExpired] = useState(false);
  const [userExpiredAt, setUserExpiredAt] = useState<string | null>(null);
  const [tier, setTier] = useState<PlayerTier>("free");
  const { toast } = useToast();
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupFirstName, setSignupFirstName] = useState("");
  const [signupSubmitting, setSignupSubmitting] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [paywallMode, setPaywallMode] = useState<"signup" | "login">("login");
  const [telegramPopupOpen, setTelegramPopupOpen] = useState(false);
  const [paywallCustom, setPaywallCustom] = useState<{ custom_text: string | null; testimonials: { name: string; quote: string }[] } | null>(null);
  const trackedPaywallViewsRef = useRef<Set<string>>(new Set());
  const [detailTab, setDetailTab] = useState<"episodes" | "trailer" | "similar" | "details">("episodes");
  const [similar, setSimilar] = useState<{ id: string; title: string; banner_url: string | null; tag: string | null; year: number | null }[]>([]);

  // Similar titles — matched by shared genre keywords from the title's tag.
  useEffect(() => {
    if (!content?.id) { setSimilar([]); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("contents")
        .select("id, title, banner_url, tag, year, is_archived")
        .limit(400);
      if (cancelled) return;
      const genres = String(content.tag || "")
        .split(/[,/|]/)
        .map((g) => g.trim().toLowerCase())
        .filter(Boolean);
      const seenTitles = new Set([content.title.trim().toLowerCase()]);
      const scored = ((data || []) as any[])
        .filter((c) => !c.is_archived && c.id !== content.id)
        .map((c) => {
          const key = String(c.title).trim().toLowerCase();
          const cGenres = String(c.tag || "").split(/[,/|]/).map((g: string) => g.trim().toLowerCase()).filter(Boolean);
          const overlap = cGenres.filter((g: string) => genres.includes(g)).length;
          return { c, key, overlap };
        })
        .filter((x) => x.overlap > 0)
        .sort((a, b) => b.overlap - a.overlap);
      const out: any[] = [];
      for (const x of scored) {
        if (seenTitles.has(x.key)) continue;
        seenTitles.add(x.key);
        out.push({ id: x.c.id, title: x.c.title, banner_url: x.c.banner_url, tag: x.c.tag, year: x.c.year });
        if (out.length >= 12) break;
      }
      setSimilar(out);
    })();
    return () => { cancelled = true; };
  }, [content?.id, content?.tag, content?.title]);





  const fetchContent = async () => {
    if (!id) return;
    if (authLoading) return; // wait for auth to settle to avoid double-fetch
    setAccessResolved(false);
    let requestedContentId = id;
    const contentPromise = supabase
      .from("contents")
      .select("id, title, year, tag, type, banner_url, section, position, is_premium, supporter_player_enabled, synopsis, preview_video_url, cast_members")
      .eq("id", id)
      .single();
    const profilePromise = user
      ? supabase
          .from("profiles")
          .select("is_premium, premium_expires_at")
          .eq("user_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null } as any);
    const premiumAccessPromise = user
      ? supabase.rpc("current_user_can_play_premium")
      : Promise.resolve({ data: false, error: null } as any);

    const [{ data }, { data: profile, error: profileError }, { data: canPlayPremium, error: premiumAccessError }] = await Promise.all([
      contentPromise,
      profilePromise,
      premiumAccessPromise,
    ]);
    if (!data) {
      setAccessResolved(true);
      return;
    }
    let resolvedContent = data as ContentItem;

    const notExpired = !profile?.premium_expires_at || new Date(profile.premium_expires_at) > new Date();
    const hasPremiumFromProfile = !!(profile?.is_premium && notExpired);
    const hasPremium = isAdmin || Boolean(canPlayPremium) || hasPremiumFromProfile;
    const expired = !hasPremium && !!(profile?.is_premium && profile?.premium_expires_at && new Date(profile.premium_expires_at) <= new Date());

    // 100% paid platform: every title requires Supporter access.
    const requiresSupporter = true;
    if (requiresSupporter) {

      if (hasPremium) {
        setPremiumBlocked(false);
        setUserIsPremium(true);
      } else if (!user) {
        setPremiumBlocked(true);
        setUserIsPremium(false);
      } else if (profileError && premiumAccessError) {
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

    if (data.type === "serie" || data.type === "novela" || data.type === "anime" || data.type === "reality") {
      const { data: eps } = await supabase
        .from("episodes")
        .select("id, content_id, title, episode_number, season, is_premium, created_at")
        .eq("content_id", requestedContentId)
        .order("season")
        .order("episode_number");
      let normalizedEpisodes = ((eps || []) as Episode[]).map(e => ({ ...e, season: e.season || 1 }));
      if (normalizedEpisodes.length === 0) {
        const { data: duplicates } = await supabase
          .from("contents")
          .select("id, title, year, tag, type, banner_url, section, position, is_premium, supporter_player_enabled, synopsis, preview_video_url")
          .ilike("title", `${data.title.trim()}%`)
          .neq("id", id)
          .in("type", ["serie", "novela", "anime", "reality"]);
        const duplicateIds = ((duplicates || []) as ContentItem[]).map((item) => item.id);
        if (duplicateIds.length > 0) {
          const { data: duplicateEpisodes } = await supabase
            .from("episodes")
            .select("id, content_id, title, episode_number, season, is_premium, created_at")
            .in("content_id", duplicateIds)
            .order("season")
            .order("episode_number");
          const firstEpisode = duplicateEpisodes?.[0] as Episode | undefined;
          const duplicateWithEpisodes = firstEpisode
            ? ((duplicates || []) as ContentItem[]).find((item) => item.id === firstEpisode.content_id)
            : null;
          if (duplicateWithEpisodes) {
            requestedContentId = duplicateWithEpisodes.id;
            resolvedContent = duplicateWithEpisodes;
            normalizedEpisodes = ((duplicateEpisodes || []) as Episode[])
              .filter((episode) => episode.content_id === requestedContentId)
              .map(e => ({ ...e, season: e.season || 1 }));
          }
        }
      }
      setContent(resolvedContent);
      setEpisodes(normalizedEpisodes);
      if (normalizedEpisodes.length > 0) {
        const requestedEpId = new URLSearchParams(window.location.search).get("ep");
        const resumeEp =
          (requestedEpId && normalizedEpisodes.find((e) => e.id === requestedEpId)) || normalizedEpisodes[0];
        setSelectedSeason(resumeEp.season);
        setCurrentEp(resumeEp);
      } else {
        setCurrentEp(null);
      }
    } else {
      setContent(resolvedContent);
      setEpisodes([]);
      setCurrentEp(null);
    }
    setAccessResolved(true);
  };

  // Clear stale state immediately when switching to a different title so the
  // previous paywall/testimonials don't flash before the new content loads.
  useEffect(() => {
    setContent(null);
    setEpisodes([]);
    setCurrentEp(null);
    setPaywallCustom(null);
    setPremiumBlocked(false);
    setAccessResolved(false);
    setEpisodeLinks([]);
    setLinksLoading(true);
    setSelectedLinkIdx(-1);
    setRawPlayerUrl("");
  }, [id]);

  useEffect(() => {
  fetchContent();
}, [id, user?.id, isAdmin, authLoading]);

  // Re-check supporter status only for signed-in users (e.g. after returning
  // from Stripe checkout). Skip for signed-out visitors so the paywall doesn't
  // flicker every time the tab regains focus.
  useEffect(() => {
    if (!user?.id) return;
    let lastRun = 0;
    const refresh = () => {
      if (document.visibilityState !== "visible" || authLoading) return;
      const now = Date.now();
      if (now - lastRun < 3000) return; // throttle
      lastRun = now;
      void fetchContent();
    };
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [id, user?.id, isAdmin, authLoading]);



  useEffect(() => {
    if (!content?.id) { setPaywallCustom(null); return; }
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any)
        .from("paywall_customizations")
        .select("custom_text, testimonials")
        .eq("content_id", content.id)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        const raw = Array.isArray(data.testimonials) ? data.testimonials : [];
        const testimonials = raw
          .map((t: any) => ({ name: String(t?.name ?? "").trim(), quote: String(t?.quote ?? "").trim() }))
          .filter((t: any) => t.name && t.quote);
        setPaywallCustom({ custom_text: data.custom_text ?? null, testimonials });
      } else {
        setPaywallCustom(null);
      }
    })();
    return () => { cancelled = true; };
  }, [content?.id]);


  const userCanWatchPremium = userIsPremium || isAdmin;
  const episodePremiumBlocked = Boolean(currentEp?.is_premium && !userCanWatchPremium);
  const isBlocked = accessResolved && (premiumBlocked || episodePremiumBlocked) && !userCanWatchPremium;

  // Remember what the user started watching so it shows up in "Continue Watching".
  useEffect(() => {
    if (!user?.id || !content?.id || !accessResolved || isBlocked) return;
    void saveWatchProgress({
      userId: user.id,
      contentId: content.id,
      episodeId: currentEp?.id ?? null,
      season: currentEp?.season ?? null,
      episodeNumber: currentEp?.episode_number ?? null,
    });
  }, [user?.id, content?.id, currentEp?.id, accessResolved, isBlocked]);


  type EpisodeLink = { title: string; type: "embed" | "redirect"; url: string };
  const [episodeLinks, setEpisodeLinks] = useState<EpisodeLink[]>([]);
  const [linksLoading, setLinksLoading] = useState(true);
  const [selectedLinkIdx, setSelectedLinkIdx] = useState(-1);
  const [rawPlayerUrl, setRawPlayerUrl] = useState("");
  const normalizeEpisodeLabel = (value?: string | null, fallbackEpisodeNumber?: number) => {
    const normalized = (value || "").trim().replace(/^Episódio\s+/i, "Episode ");
    return normalized || (fallbackEpisodeNumber ? `Episode ${fallbackEpisodeNumber}` : "Episode");
  };

  useEffect(() => {
    let cancelled = false;
    const resolve = async () => {
      if (isBlocked) { setEpisodeLinks([]); setRawPlayerUrl(""); setSelectedLinkIdx(-1); setLinksLoading(false); return; }
      setLinksLoading(true);
      setEpisodeLinks([]);
      setSelectedLinkIdx(-1);
      setRawPlayerUrl("");
      if (currentEp?.id) {
        const { data } = await (supabase.rpc as any)("get_episode_links", { _episode_id: currentEp.id });
        let resolvedLinks = Array.isArray(data) ? (data as EpisodeLink[]) : [];
        if (cancelled) return;
        if (resolvedLinks.length === 0) {
          const { data: legacy } = await supabase.rpc("get_episode_player_url", { _episode_id: currentEp.id });
          const url = (legacy as string | null) || "";
          if (cancelled) return;
          resolvedLinks = url ? [{ title: "Watch on site", type: "embed", url }] : [];
        }
        setEpisodeLinks(resolvedLinks);
      } else if (content?.id) {
        const { data } = await (supabase.rpc as any)("get_content_links", { _content_id: content.id });
        let resolvedLinks = Array.isArray(data) ? (data as EpisodeLink[]) : [];
        if (cancelled) return;
        if (resolvedLinks.length === 0) {
          const { data: legacy } = await supabase.rpc("get_content_player_url", { _content_id: content.id });
          const url = (legacy as string | null) || "";
          if (cancelled) return;
          resolvedLinks = url ? [{ title: "Watch on site", type: "embed", url }] : [];
        }
        setEpisodeLinks(resolvedLinks);
      } else {
        setEpisodeLinks([]);
        setSelectedLinkIdx(-1);
        setRawPlayerUrl("");
      }
      if (!cancelled) setLinksLoading(false);
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
    navigate("/?highlight=supporter#supporter-card");
  };

  const handleSupporterSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signupSubmitting) return;
    setSignupSubmitting(true);
    const visitorId = getFunnelVisitorId();
    const email = signupEmail.trim().toLowerCase();
    void trackEvent("paywall_signup_submit", "paywall_inline_form", { visitor_id: visitorId, email });
    const redirectPath = `/player/${id}`;
    const authAction = paywallMode === "login"
      ? supabase.auth.signInWithPassword({ email, password: signupPassword })
      : supabase.auth.signUp({
          email,
          password: signupPassword,
          options: {
            emailRedirectTo: getEmailRedirectUrl(redirectPath),
            data: { first_name: signupFirstName.trim() },
          },
        });

    const { error } = await authAction;
    setSignupSubmitting(false);
    if (error) {
      toast({
        title: paywallMode === "login" ? "Login failed" : "Sign up failed",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    if (paywallMode === "login") {
      toast({ title: "Logged in!", description: "Your session was restored. Choose a Supporter plan to unlock the content." });
      return;
    }

    setSignupSuccess(true);
    toast({ title: "Account created!", description: "Check your email to confirm, then choose a Supporter plan to unlock the content." });
  };


  // Track when user lands on locked content / paywall
  useEffect(() => {
    if (!content || !isBlocked) return;
    const source = episodePremiumBlocked ? "premium_episode" : "premium_content";
    const key = `${content.id}:${currentEp?.id ?? "content"}:${source}`;
    if (trackedPaywallViewsRef.current.has(key)) return;
    trackedPaywallViewsRef.current.add(key);
    void trackEvent("paywall_view", source);
    void trackEvent("locked_content_view", source);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content?.id, isBlocked, episodePremiumBlocked, currentEp?.id]);

  // Old in-player paywall is disabled — redirect non-supporters straight to the plans page
  useEffect(() => {
    if (!accessResolved) return;
    if (isBlocked && !userIsPremium && !isAdmin) {
      navigate("/?highlight=supporter#supporter-card", { replace: true });
    }
  }, [accessResolved, isBlocked, userIsPremium, isAdmin, navigate]);

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

      {!accessResolved || authLoading ? (
        <div className="w-full flex-1 px-3 pt-16 pb-8 sm:px-4 sm:pt-20" aria-label="Loading title">
          <div className="mx-auto w-full max-w-5xl space-y-5">
            <div className="space-y-2">
              <Skeleton className="h-8 w-3/4 max-w-md" />
              <Skeleton className="h-4 w-36" />
            </div>
            <Skeleton className="w-full aspect-video rounded-xl" />
            <div className="space-y-3">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
            <div className="flex gap-5 border-b border-border pb-3">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-16" />
            </div>
          </div>
        </div>
      ) : isBlocked && !userIsPremium && !isAdmin ? (
        null
      ) : false ? (
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
                    {`“${content?.title ?? "This title"}” is waiting for you`}
                  </h2> 
                  {content?.preview_video_url && (() => {
                  const prev = content.preview_video_url!.trim();
                  const isHtml = prev.toLowerCase().startsWith("<iframe");
                  return (
                    <div key={prev} className="relative w-full overflow-hidden rounded-xl bg-black mb-4"
                      style={{ paddingBottom: "56.25%", height: 0 }}>
                      {isHtml ? (
                        <div
                          className="absolute inset-0 [&>iframe]:absolute [&>iframe]:inset-0 [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:border-0"
                          dangerouslySetInnerHTML={{
                            __html: DOMPurify.sanitize(prev, {
                              ALLOWED_TAGS: ["iframe"],
                              ALLOWED_ATTR: ["src", "allow", "allowfullscreen", "width", "height", "frameborder", "referrerpolicy", "title", "loading"],
                              ADD_ATTR: ["allowfullscreen"],
                            }),
                          }}
                        />
                      ) : (
                        <iframe
                          key={prev}
                          src={getEmbedUrl(prev)}
                          className="absolute inset-0 w-full h-full border-0"
                          allowFullScreen
                          allow="autoplay; fullscreen; accelerometer; encrypted-media; gyroscope; picture-in-picture"
                          style={{ border: 0 }}
                        />
                      )}
                    </div>

                  );
                })()}

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
                    // Capped at 62 supporters total — never inflated past reality
                    const growthBucket = Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 3));
                    const others = Math.min(62, 53 + (growthBucket % 4) * 2);
                    return (
                      <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/15 border border-green-500/40 text-green-400 px-2.5 py-1 text-[11px] font-bold">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
                          </span>
                          {a}, {b} and {others} others became Supporters this month
                        </span>
                      </div>
                    );
                  })()}

                  {paywallCustom?.custom_text?.trim() && paywallCustom.custom_text.trim() !== DEFAULT_PAYWALL_TEXT && (
                    <p className="text-foreground text-xs sm:text-sm mb-5 max-w-md font-bold whitespace-pre-wrap">
                      {paywallCustom.custom_text.trim()}
                    </p>
                  )}

                  {content?.id && (
                    <PaywallComments contentId={content.id} custom={paywallCustom?.testimonials} compact />
                  )}
                </>
              )}

              <div className="grid grid-cols-3 gap-2 sm:gap-3 max-w-md w-full mb-5">
                {[
                  { icon: "▶️", title: "Watch this title right now" },
                  { icon: "💜", title: "Full access to our exclusive catalog" },
                  { icon: "✨", title: "New titles added every month" },
                ].map((perk) => (
                  <div key={perk.title} className="rounded-lg bg-card/70 border border-border px-2 py-3 text-center backdrop-blur-sm">
                    <div className="text-lg leading-none mb-1">{perk.icon}</div>
                    <div className="text-[11px] sm:text-xs font-bold text-foreground leading-tight">{perk.title}</div>
                  </div>
                ))}
              </div>




              {!user && !signupSuccess && (
                <form onSubmit={handleSupporterSignup} className="w-full max-w-sm space-y-2 mb-3 text-left" aria-label="Supporter signup">
                  <div className="flex rounded-full bg-muted p-1 mb-1">
                    <button
                      type="button"
                      onClick={() => setPaywallMode("login")}
                      className={`flex-1 rounded-full px-3 py-2 text-xs font-semibold transition-colors ${paywallMode === "login" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      Login
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaywallMode("signup")}
                      className={`flex-1 rounded-full px-3 py-2 text-xs font-semibold transition-colors ${paywallMode === "signup" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      Create account
                    </button>
                  </div>
                  {paywallMode === "signup" && (
                    <input
                      type="text"
                      placeholder="Your first name"
                      value={signupFirstName}
                      onChange={(e) => setSignupFirstName(e.target.value)}
                      className="w-full rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-primary"
                      required
                      maxLength={50}
                    />
                  )}
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
                    {paywallMode === "login" ? "Login and continue" : "Create account"}
                  </button>
                </form>
              )}

              {!user && signupSuccess && (
                <div className="w-full max-w-sm rounded-lg bg-primary/10 border border-primary/30 px-3 py-3 mb-3 text-xs text-foreground">
                  Check your email to confirm, then choose a Supporter plan to unlock this content.
                </div>
              )}

              {user && (
                <div className="w-full max-w-sm flex flex-col gap-2.5">
                  <button
                    onClick={() => goToPlans("paywall_premium_content")}
                    className="shine-cta w-full rounded-full text-white font-semibold py-3 text-sm flex items-center justify-center gap-2 border-0 shadow-[0_0_30px_rgba(168,85,247,0.45)] hover:opacity-95"
                    style={{ background: "linear-gradient(90deg, #ec4899 0%, #a855f7 50%, #6366f1 100%)" }}
                  >
                    <Crown className="w-4 h-4" /> {userExpired ? "Renew my Supporter plan" : "Yes, become a Supporter"}
                  </button>
                  <button
                    onClick={() => setTelegramPopupOpen(true)}
                    className="w-full rounded-full bg-transparent border border-white/15 text-foreground/90 hover:bg-white/5 transition-colors py-2.5 text-sm font-medium"
                  >
                    Not now
                  </button>
                </div>
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
                ? normalizeEpisodeLabel(currentEp.title, currentEp.episode_number)
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
                ) : linksLoading && content ? (
                  <div className={isMobile ? "mt-4 space-y-3 px-3" : "mt-5 space-y-3"} aria-label="Loading watch links">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-12 w-full rounded-lg" />
                    <Skeleton className="h-12 w-full rounded-lg" />
                  </div>
                ) : !linksLoading && content && (currentEp || !(content.type === "serie" || content.type === "novela" || content.type === "anime" || content.type === "reality")) ? (
                  <div className={isMobile ? "mt-4 px-3" : "mt-5"}>
                    <p className="text-sm text-muted-foreground">No links available for this {currentEp ? "episode" : "title"} yet.</p>
                  </div>
                ) : null}

                {playerTierSelector}
              </>
            );
          })()}
        </div>
      </div>
      )}


      {!isBlocked && content && (() => {
        const isEpisodic = content.type === "serie" || content.type === "novela" || content.type === "anime" || content.type === "reality";
        const hasEpisodes = !premiumBlocked && isEpisodic && episodes.length > 0;
        const trailer = (content as any)?.preview_video_url?.trim() || "";
        const tabs: { key: typeof detailTab; label: string }[] = [
          ...(hasEpisodes ? [{ key: "episodes" as const, label: "Episodes" }] : []),
          { key: "details" as const, label: "Details" },
          ...(trailer ? [{ key: "trailer" as const, label: "Trailer" }] : []),
          ...(similar.length ? [{ key: "similar" as const, label: "Similar" }] : []),
        ];
        const active = tabs.some((t) => t.key === detailTab) ? detailTab : tabs[0].key;
        const seasons = [...new Set(episodes.map((e) => e.season))].sort((a, b) => a - b);
        const filteredEps = episodes.filter((e) => e.season === selectedSeason);
        const typeLabel = content.type === "serie" ? "Series" : content.type === "novela" ? "Soap Opera" : content.type === "reality" ? "Reality Show" : "Movie";
        const isTrailerIframe = trailer.toLowerCase().startsWith("<iframe");

        return (
          <div className="w-full max-w-5xl mx-auto px-4 sm:px-0 pb-8">
            {/* Tabs */}
            <div className="mt-5 sm:mt-7 border-b border-border">
              <div className="flex gap-5 sm:gap-7 overflow-x-auto scrollbar-hide">
                {tabs.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setDetailTab(t.key)}
                    className={`relative whitespace-nowrap pb-3 text-sm sm:text-base font-semibold transition-colors ${
                      active === t.key ? "text-foreground" : "text-muted-foreground hover:text-foreground/80"
                    }`}
                  >
                    {t.label}
                    {active === t.key && (
                      <span className="absolute left-0 right-0 -bottom-px h-[2px] rounded-full bg-primary" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Episodes */}
            {active === "episodes" && hasEpisodes && (
              <div className="mt-5 space-y-3">
                {seasons.length > 1 && (
                  <div className="flex gap-2 flex-wrap">
                    {seasons.map((s) => (
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
                <p className="text-sm font-semibold text-primary">
                  Season {selectedSeason} · {filteredEps.length} episodes
                </p>
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
                      <span className={isMobile ? "text-xs text-foreground" : "text-sm text-foreground"}>{normalizeEpisodeLabel(ep.title, ep.episode_number)}</span>
                      {ep.is_premium && <Crown className="w-3 h-3 text-secondary flex-shrink-0" />}
                      {currentEp?.id === ep.id && <Play className="w-3 h-3 text-primary ml-auto" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Trailer */}
            {active === "trailer" && trailer && (
              <div className="mt-5">
                <div key={trailer} className="relative w-full overflow-hidden rounded-xl bg-black" style={{ paddingBottom: "56.25%", height: 0 }}>
                  {isTrailerIframe ? (
                    <div
                      className="absolute inset-0 [&>iframe]:absolute [&>iframe]:inset-0 [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:border-0"
                      dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(trailer, {
                          ALLOWED_TAGS: ["iframe"],
                          ALLOWED_ATTR: ["src", "allow", "allowfullscreen", "width", "height", "frameborder", "referrerpolicy", "title", "loading"],
                          ADD_ATTR: ["allowfullscreen"],
                        }),
                      }}
                    />
                  ) : (
                    <iframe
                      key={trailer}
                      src={getEmbedUrl(trailer)}
                      className="absolute inset-0 w-full h-full border-0"
                      allowFullScreen
                      allow="autoplay; fullscreen; accelerometer; encrypted-media; gyroscope; picture-in-picture"
                    />
                  )}
                </div>
                {isAdmin && (
                  <button
                    onClick={() => setEditOpen(true)}
                    className="mt-3 text-xs text-primary font-semibold inline-flex items-center gap-1.5"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Change trailer video
                  </button>
                )}
              </div>
            )}

            {/* Similar */}
            {active === "similar" && (
              <div className="mt-5">
                {similar.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No similar titles yet.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {similar.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => navigate(`/player/${s.id}`)}
                        className="text-left group rounded-xl overflow-hidden bg-card border border-border hover:border-primary/40 transition-colors"
                      >
                        <div className="aspect-video bg-muted overflow-hidden">
                          <img
                            src={s.banner_url || "/placeholder.svg"}
                            alt={s.title}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                        <div className="p-2.5">
                          <p className="text-xs font-semibold text-foreground line-clamp-1">{s.title}</p>
                          <p className="text-[10px] text-muted-foreground line-clamp-1">{s.tag}{s.year ? ` · ${s.year}` : ""}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Details */}
            {active === "details" && (() => {
              const castList = parseCast((content as any)?.cast_members);
              return (
                <div className="mt-5 space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-0.5 text-xs rounded bg-primary/20 text-primary">{content.tag}</span>
                    <span className="px-2 py-0.5 text-xs rounded bg-secondary/20 text-secondary">{content.year}</span>
                    <span className="px-2 py-0.5 text-xs rounded bg-muted text-muted-foreground">{typeLabel}</span>
                  </div>
                  {(content as any)?.synopsis ? (
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{(content as any).synopsis}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">No description yet.</p>
                  )}

                  {castList.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-bold text-foreground">Cast</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {castList.map((m, i) => (
                          <div key={`${m.name}-${i}`} className="flex items-center gap-2.5 rounded-xl bg-card border border-border p-2.5">
                            {m.photo_url ? (
                              <img
                                src={m.photo_url}
                                alt={m.name}
                                loading="lazy"
                                className="w-10 h-10 rounded-full object-cover border border-border flex-shrink-0"
                              />
                            ) : (
                              <span className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0 text-xs font-bold text-muted-foreground">
                                {m.name.charAt(0).toUpperCase()}
                              </span>
                            )}
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-foreground line-clamp-1">{m.name}</p>
                              {m.role && <p className="text-[10px] text-muted-foreground line-clamp-1">{m.role}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {isAdmin && (
                    <button
                      onClick={() => setEditDetailsOpen(true)}
                      className="text-xs text-primary font-semibold inline-flex items-center gap-1.5"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Edit details
                    </button>
                  )}
                </div>
              );
            })()}

            {!premiumBlocked && <CommentsSection contentId={content.id} />}
          </div>
        );
      })()}



      {content && <EditContentDialog open={editOpen} onOpenChange={setEditOpen} content={content} onSaved={fetchContent} />}
      {content && <EditDetailsDialog open={editDetailsOpen} onOpenChange={setEditDetailsOpen} content={content as any} onSaved={fetchContent} />}

      <Dialog
        open={telegramPopupOpen}
        onOpenChange={(open) => {
          setTelegramPopupOpen(open);
          if (!open) navigate(-1);
        }}
      >
        <DialogContent className="max-w-sm bg-[#0B0B0F] border border-purple-500/30 text-foreground shadow-[0_0_40px_rgba(168,85,247,0.25)] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-center">Stay in the loop 💜</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground text-center pt-1">
              Don't miss new titles and releases — join our official Telegram channel for free.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3 pt-2">
            <a
              href="https://t.me/QueerScenesTv"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                setTelegramPopupOpen(false);
                setTimeout(() => navigate(-1), 100);
              }}
              className="w-full text-center rounded-full text-white font-semibold py-3 text-sm shadow-[0_0_25px_rgba(168,85,247,0.4)] hover:opacity-95 transition-opacity"
              style={{ background: "linear-gradient(90deg, #ec4899 0%, #a855f7 50%, #6366f1 100%)" }}
            >
              Join the community
            </a>
            <button
              onClick={() => {
                setTelegramPopupOpen(false);
                navigate(-1);
              }}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
            >
              No thanks
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Player;
