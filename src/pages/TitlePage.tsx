import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import DOMPurify from "dompurify";
import { Play, Heart, Sparkles, ChevronLeft, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { slugify } from "@/lib/slug";
import { useAuth } from "@/hooks/useAuth";
import { DEFAULT_PAYWALL_TEXT } from "@/components/PaywallCustomizationsAdmin";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface TitleContent {
  id: string;
  title: string;
  year: number | null;
  tag: string | null;
  type: string | null;
  banner_url: string | null;
  synopsis: string | null;
  preview_video_url: string | null;
  is_archived?: boolean | null;
}

const SITE = "https://queerscenes.lovable.app";

const setMeta = (selector: string, attr: string, value: string) => {
  let el = document.head.querySelector(selector) as HTMLMetaElement | HTMLLinkElement | null;
  if (!el) {
    if (selector.startsWith("link")) {
      el = document.createElement("link");
      (el as HTMLLinkElement).rel = "canonical";
    } else {
      el = document.createElement("meta");
      const m = selector.match(/\[(name|property)="([^"]+)"\]/);
      if (m) (el as HTMLMetaElement).setAttribute(m[1], m[2]);
    }
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
};

const getEmbedUrl = (url: string) => {
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed);
    if (parsed.hostname.includes("drive.google.com")) {
      const fileFromPath = parsed.pathname.match(/\/file\/d\/([^/]+)/)?.[1];
      const id = fileFromPath || parsed.searchParams.get("id");
      if (id) return `https://drive.google.com/file/d/${id}/preview`;
    }
    if (parsed.hostname.includes("dailymotion.com")) {
      const v = parsed.pathname.match(/\/video\/([a-zA-Z0-9]+)/)?.[1];
      if (v) return `https://www.dailymotion.com/embed/video/${v}`;
    }
    if (parsed.hostname === "dai.ly") {
      const v = parsed.pathname.replace("/", "");
      if (v) return `https://www.dailymotion.com/embed/video/${v}`;
    }
    if (parsed.hostname.includes("youtube.com") || parsed.hostname === "youtu.be") {
      let v = parsed.searchParams.get("v");
      if (!v && parsed.hostname === "youtu.be") v = parsed.pathname.slice(1);
      if (v) return `https://www.youtube.com/embed/${v}`;
    }
  } catch { /* noop */ }
  return trimmed;
};

const TitlePage = () => {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [content, setContent] = useState<TitleContent | null>(null);
  const [playableContentId, setPlayableContentId] = useState<string | null>(null);
  const [canWatch, setCanWatch] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [customText, setCustomText] = useState<string | null>(null);
  const [readMore, setReadMore] = useState(false);
  const [telegramOpen, setTelegramOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("contents")
        .select("id, title, year, tag, type, banner_url, synopsis, preview_video_url, is_archived")
        .order("title");
      if (cancelled) return;
      const list = ((data ?? []) as TitleContent[]).filter((c) => !c.is_archived);
      const matches = list.filter((c) => slugify(c.title) === slug);
      const matchIds = matches.map((c) => c.id);
      const { data: episodeRows } = matchIds.length
        ? await supabase.from("episodes").select("content_id").in("content_id", matchIds)
        : { data: [] as any[] };
      const episodeCounts = new Map<string, number>();
      (episodeRows || []).forEach((row: any) => {
        episodeCounts.set(row.content_id, (episodeCounts.get(row.content_id) || 0) + 1);
      });
      // Prefer the duplicate that has a preview video, then any non-"exclusivos" section.
      const match =
        matches.find((c) => (c.preview_video_url ?? "").trim().length > 0) ??
        matches[0];
      if (!match) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setContent(match);
      const playable =
        matches.find((c) => (episodeCounts.get(c.id) || 0) > 0) ??
        match;
      setPlayableContentId(playable.id);
      const { data: pw } = await (supabase as any)
        .from("paywall_customizations")
        .select("custom_text")
        .eq("content_id", match.id)
        .maybeSingle();
      if (!cancelled) setCustomText(pw?.custom_text ?? null);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [slug]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setCanWatch(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const [{ data: canPlay }, { data: profile }] = await Promise.all([
        supabase.rpc("current_user_can_play_premium"),
        supabase
          .from("profiles")
          .select("is_premium, premium_expires_at")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      const notExpired = !profile?.premium_expires_at || new Date(profile.premium_expires_at) > new Date();
      setCanWatch(isAdmin || Boolean(canPlay) || Boolean(profile?.is_premium && notExpired));
    })();
    return () => { cancelled = true; };
  }, [user?.id, isAdmin, authLoading]);

  useEffect(() => {
    if (!content) return;
    const title = `${content.title} — Watch with subtitles | QueerScenes`;
    const desc = (content.synopsis || `Watch ${content.title} with subtitles on QueerScenes — LGBTQIA+ movies and series.`).slice(0, 160);
    const url = `${SITE}/title/${slug}`;
    document.title = title;
    setMeta('meta[name="description"]', "content", desc);
    setMeta('meta[property="og:title"]', "content", title);
    setMeta('meta[property="og:description"]', "content", desc);
    setMeta('meta[property="og:url"]', "content", url);
    setMeta('meta[property="og:type"]', "content", "video.other");
    setMeta('link[rel="canonical"]', "href", url);
    if (content.banner_url) {
      setMeta('meta[property="og:image"]', "content", content.banner_url);
      setMeta('meta[name="twitter:image"]', "content", content.banner_url);
    }
    setMeta('meta[name="twitter:card"]', "content", "summary_large_image");
    setMeta('meta[name="twitter:title"]', "content", title);
    setMeta('meta[name="twitter:description"]', "content", desc);
  }, [content, slug]);

  const social = useMemo(() => {
    const names = ["Ashley","Layla","Camille","Lena","Elin","Noor","Léa","Manon","Mila","Anouk","Chloé","Hannah","Yasmin","Alina","Lucas"];
    const seed = (content?.id || "x").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const bucket = Math.floor(Date.now() / (90 * 1000));
    const a = names[(seed + bucket * 17) % names.length];
    let bIdx = (seed + bucket * 17 + 13) % names.length;
    const aIdx = (seed + bucket * 17) % names.length;
    if (bIdx === aIdx) bIdx = (bIdx + 1) % names.length;
    const b = names[bIdx];
    const others = Math.min(62, 53 + (Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 3)) % 4) * 2);
    return { a, b, others };
  }, [content?.id]);

  if (loading) {
    return <div className="min-h-screen bg-background text-foreground flex items-center justify-center">Loading…</div>;
  }
  if (notFound || !content) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-2xl font-bold">Title not found</h1>
        <Link to="/catalog" className="text-primary underline">Browse the catalog</Link>
      </div>
    );
  }

  const banner = content.banner_url || "/placeholder.svg";
  const preview = content.preview_video_url?.trim() || "";
  const isIframeHtml = preview.toLowerCase().startsWith("<iframe");
  const synopsis = content.synopsis || "";
  const paywallText = customText?.trim() || DEFAULT_PAYWALL_TEXT;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": (content.type || "").toLowerCase().includes("series") ? "TVSeries" : "Movie",
    name: content.title,
    description: synopsis || undefined,
    image: content.banner_url || undefined,
    datePublished: content.year ? String(content.year) : undefined,
    inLanguage: ["en", "es", "pt", "fr"],
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top nav */}
      <div className="sticky top-0 z-30 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 py-3">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <Link to="/" style={{ fontFamily: "'Sora', sans-serif", fontSize: "13px", fontWeight: 700, letterSpacing: ".22em", color: "#a855f7" }}>QUEER SCENES</Link>
          <Link to="/browse" className="text-xs px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:text-foreground">Browse</Link>
        </div>
      </div>

      {/* Banner */}
      <div
        className="relative w-full h-[220px] md:h-[320px] bg-cover bg-center"
        style={{ backgroundImage: `url(${banner})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4 md:p-6 max-w-3xl mx-auto">
          <h1 className="text-3xl md:text-5xl font-extrabold text-white drop-shadow-lg">{content.title}</h1>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 py-5">
        {/* Pills */}
        <div className="flex flex-wrap gap-2 mb-3">
          {content.tag && (
            <span className="text-[11px] px-3 py-1 rounded-full bg-primary/15 border border-primary/30 text-primary font-semibold">{content.tag}</span>
          )}
          {content.type && (
            <span className="text-[11px] px-3 py-1 rounded-full bg-muted border border-border text-muted-foreground font-semibold">
              {(() => {
                const t = String(content.type).toLowerCase();
                if (t.includes("filme") || t.includes("movie")) return "Movie";
                if (t.includes("novela") || t.includes("soap")) return "Soap Opera";
                if (t.includes("serie")) return "Series";
                return content.type;
              })()}
            </span>
          )}
          {content.year && (
            <span className="text-[11px] px-3 py-1 rounded-full bg-muted border border-border text-muted-foreground font-semibold">{content.year}</span>
          )}
        </div>

        {/* Languages — only render flags that appear in the per-title paywall text */}
        {(() => {
          const flags = Array.from(paywallText.matchAll(/\p{Regional_Indicator}\p{Regional_Indicator}/gu)).map((m) => m[0]);
          const unique = Array.from(new Set(flags));
          if (unique.length === 0) return null;
          return (
            <>
              <div className="text-sm text-foreground/90 font-semibold">
                Subtitles: <span className="text-base">{unique.join(" ")}</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 mb-4">
                Don't have your language? Request it in our VIP community.
              </p>
            </>
          );
        })()}

        {/* Synopsis */}
        {synopsis && (
          <div className="mb-4">
            <p className={`text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap ${readMore ? "" : "line-clamp-3"}`}>
              {synopsis}
            </p>
            {synopsis.length > 180 && (
              <button
                onClick={() => setReadMore((v) => !v)}
                className="mt-1 text-xs text-primary font-semibold"
              >
                {readMore ? "Show less" : "Read more"}
              </button>
            )}
          </div>
        )}

        <hr className="border-border/60 mb-5" />

        {/* Preview video */}
        {preview ? (
          <div className="relative w-full overflow-hidden rounded-xl bg-black mb-5" style={{ paddingBottom: "56.25%", height: 0 }}>
            {isIframeHtml ? (
              <div
                className="absolute inset-0 [&>iframe]:absolute [&>iframe]:inset-0 [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:border-0"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(preview, {
                    ALLOWED_TAGS: ["iframe"],
                    ALLOWED_ATTR: ["src","allow","allowfullscreen","width","height","frameborder","referrerpolicy","title","loading"],
                    ADD_ATTR: ["allowfullscreen"],
                  }),
                }}
              />
            ) : (
              <iframe
                src={getEmbedUrl(preview)}
                className="absolute inset-0 w-full h-full border-0"
                allowFullScreen
                allow="autoplay; fullscreen; accelerometer; encrypted-media; gyroscope; picture-in-picture"
              />
            )}
          </div>
        ) : (
          <div className="relative w-full rounded-xl bg-muted/40 border border-border mb-5 flex items-center justify-center" style={{ paddingBottom: "56.25%", height: 0 }}>
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
              Preview coming soon
            </div>
          </div>
        )}

        {/* Social proof */}
        <div className="flex justify-center mb-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/15 border border-green-500/40 text-green-400 px-3 py-1 text-[11px] font-bold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
            </span>
            {social.a}, {social.b} and {social.others} others became Supporters this month
          </span>
        </div>

        {/* Paywall copy */}
        <p className="text-foreground text-sm md:text-base leading-relaxed font-bold whitespace-pre-wrap text-center mb-6">
          {paywallText}
        </p>

        {/* Benefits */}
        <div className="grid grid-cols-3 gap-2 md:gap-3 mb-6">
          {[
            { Icon: Play, title: "Watch this title right now" },
            { Icon: Heart, title: "Full access to our exclusive catalog" },
            { Icon: Sparkles, title: "New titles added every month" },
          ].map(({ Icon, title }) => (
            <div key={title} className="rounded-xl bg-card/70 border border-border px-2 py-3 text-center backdrop-blur-sm">
              <Icon className="w-5 h-5 mx-auto mb-1 text-primary" />
              <div className="text-[11px] md:text-xs font-bold text-foreground leading-tight">{title}</div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <Link
          to={canWatch && playableContentId ? `/player/${playableContentId}` : "/?highlight=supporter#supporter-card"}
          className="shine-cta w-full flex items-center justify-center gap-2 rounded-full py-3 text-sm font-bold text-white bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-600 hover:opacity-95 shadow-lg shadow-fuchsia-500/30"
        >
          {canWatch ? <Play className="w-4 h-4" /> : <Crown className="w-4 h-4" />}
          {canWatch ? "Watch episodes now" : "Yes, become a Supporter"}
        </Link>

        <div className="text-center mt-3 mb-8">
          <button
            onClick={() => setTelegramOpen(true)}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4"
          >
            Not now
          </button>
        </div>
      </main>

      <Dialog open={telegramOpen} onOpenChange={setTelegramOpen}>
        <DialogContent className="max-w-sm bg-background border-primary/30">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">Stay in the loop 💜</DialogTitle>
            <DialogDescription className="text-center">
              Don't miss new titles and releases — join our official Telegram channel for free.
            </DialogDescription>
          </DialogHeader>
          <a
            href="https://t.me/QueerScenesTv"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center rounded-full py-2.5 text-sm font-bold text-white bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-600"
            onClick={() => setTelegramOpen(false)}
          >
            Join the community
          </a>
          <button
            onClick={() => setTelegramOpen(false)}
            className="text-xs text-muted-foreground hover:text-foreground mx-auto"
          >
            No thanks
          </button>
        </DialogContent>
      </Dialog>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </div>
  );
};

export default TitlePage;
