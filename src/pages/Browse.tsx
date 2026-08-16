import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Plus, Menu, X, Search, Bookmark, LogOut, Pencil, Trash2, Crown, Settings, Sparkles, Instagram, Youtube, Facebook, Music2, StarOff } from "lucide-react";
import { XIcon } from "@/components/icons/XIcon";
import { getSocialIcon } from "@/lib/social-icons";
import { Button } from "@/components/ui/button";

import ProfileDialog from "@/components/ProfileDialog";
import SupportDialog from "@/components/SupportDialog";
import MessagesPopover from "@/components/MessagesPopover";
import TitlesTicker from "@/components/TitlesTicker";
import EditContentDialog from "@/components/EditContentDialog";
import AddExistingContentDialog from "@/components/AddExistingContentDialog";
import AutoScrollRow from "@/components/AutoScrollRow";
import SiteNoteBanner from "@/components/SiteNoteBanner";
import RecentUpdatesSection from "@/components/RecentUpdatesSection";
import ContinueWatchingSection from "@/components/ContinueWatchingSection";
import { slugify } from "@/lib/slug";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { buildUniqueTopContent, fetchTopContentRanking, getUniqueItemsByTitle } from "@/lib/top-content";
import { trackSupporterClick } from "@/lib/supporter-tracking";
import { toast } from "sonner";

interface ContentItem {
  id: string;
  title: string;
  year: number;
  tag: string;
  type: string;
  banner_url: string | null;
  player_url?: string | null;
  preview_video_url?: string | null;
  section: string;
  position: number;
  is_premium: boolean;
  synopsis: string | null;
  is_archived?: boolean;
}

const ContentCard = ({
  item,
  isAdmin,
  onEdit,
  onDelete,
  onClickTrack,
  isInWatchlist,
  onToggleWatchlist,
  userIsPremium,
  onRemoveFromExclusives,
}: {
  item: ContentItem;
  isAdmin: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onClickTrack: () => void;
  isInWatchlist: boolean;
  onToggleWatchlist: () => void;
  userIsPremium: boolean;
  onRemoveFromExclusives?: () => void;
}) => {
  const navigate = useNavigate();
  const handleClick = () => {
    // Public SEO page first — paywall lives there; player stays behind auth.
    onClickTrack();
    navigate(`/title/${slugify(item.title)}`);
  };
  return (
    <motion.div
      className="group relative rounded-xl overflow-hidden cursor-pointer aspect-[2/3]"
      whileHover={{ scale: 1.03 }}
      transition={{ duration: 0.2 }}
      onClick={handleClick}
    >
      <img
        src={item.banner_url || "/placeholder.svg"}
        alt={item.title}
        className="w-full h-full object-cover bg-muted"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent opacity-80" />

      <button
        onClick={(e) => { e.stopPropagation(); onToggleWatchlist(); }}
        className={`absolute top-2 ${isAdmin ? 'top-12' : 'top-2'} right-2 z-10 w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-colors ${
          isInWatchlist ? 'bg-primary text-primary-foreground' : 'bg-card/90 hover:bg-primary/20 text-primary'
        }`}
        title={isInWatchlist ? "Remove from list" : "Add to list"}
      >
        {isInWatchlist ? <Bookmark className="w-3.5 h-3.5 fill-current" /> : <Plus className="w-3.5 h-3.5" />}
      </button>
      <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
        <span className="inline-block px-2 py-0.5 text-[10px] sm:text-xs rounded bg-primary/20 text-primary font-medium mb-1.5">
          {item.tag}
        </span>
        <h3 className="text-sm sm:text-base font-semibold text-foreground leading-tight">{item.title}</h3>
        <p className="text-xs text-muted-foreground">{item.year} · {item.type === "serie" ? "Series" : item.type === "novela" ? "Soap Opera" : item.type === "reality" ? "Reality Show" : "Movie"}</p>
        <p className="text-[10px] sm:text-xs text-muted-foreground/80 mt-1 line-clamp-2 leading-snug">
          {item.synopsis?.trim() || "No synopsis available."}
        </p>
      </div>
      <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <Button size="sm" className="bg-primary text-primary-foreground rounded-full glow-purple gap-1 opacity-0 group-hover:opacity-100 transition-opacity text-xs">
          <Play className="w-3 h-3" /> Watch
        </Button>
      </div>
      {isAdmin && (
        <div className="absolute top-2 right-2 flex gap-1 z-10">
          {onRemoveFromExclusives && (
            <button
              onClick={(e) => { e.stopPropagation(); onRemoveFromExclusives(); }}
              className="w-8 h-8 rounded-full bg-card/90 flex items-center justify-center hover:bg-amber-500/20 transition-colors shadow-md"
              title="Remove from Exclusives (keeps in catalog)"
            >
              <StarOff className="w-3.5 h-3.5 text-amber-400" />
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="w-8 h-8 rounded-full bg-card/90 flex items-center justify-center hover:bg-primary/20 transition-colors shadow-md"
          >
            <Pencil className="w-3.5 h-3.5 text-primary" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="w-8 h-8 rounded-full bg-card/90 flex items-center justify-center hover:bg-destructive/20 transition-colors shadow-md"
          >
            <Trash2 className="w-3.5 h-3.5 text-destructive" />
          </button>
        </div>
      )}
      <div className="absolute inset-0 rounded-xl border border-transparent group-hover:border-primary/50 transition-all pointer-events-none" />
    </motion.div>
  );
};

const Browse = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [socialLinks, setSocialLinks] = useState<{ id: string; label: string; href: string; icon: string }[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("social_links")
        .select("id, label, href, icon, is_active, position")
        .eq("is_active", true)
        .order("position", { ascending: true });
      setSocialLinks((data || []) as any);
    })();
  }, []);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingContent, setEditingContent] = useState<ContentItem | null>(null);
  const [newDefaults, setNewDefaults] = useState<{ section: string; type: string }>({ section: "series", type: "filme" });
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [watchlistIds, setWatchlistIds] = useState<Set<string>>(new Set());
  const [userIsPremium, setUserIsPremium] = useState(false);
  const [addExistingOpen, setAddExistingOpen] = useState(false);
  
  const [top10Ids, setTop10Ids] = useState<string[]>([]);
  const [currentBanner, setCurrentBanner] = useState(0);
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPremium = async () => {
      if (!user) { setUserIsPremium(false); return; }
      const { data } = await supabase
        .from("profiles")
        .select("is_premium, premium_expires_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        const notExpired = !data.premium_expires_at || new Date(data.premium_expires_at) > new Date();
        const isPrem = data.is_premium && notExpired;
        setUserIsPremium(isPrem);
      }
    };
    fetchPremium();
  }, [user, isAdmin]);

  const fetchContents = async () => {
    const { data } = await supabase
      .from("contents")
      .select("id, title, year, tag, type, banner_url, section, position, is_premium, synopsis, is_archived, supporter_player_enabled, preview_video_url, created_at, updated_at")
      .order("position")
      .order("created_at", { ascending: false });
    setContents(data || []);
  };

  const fetchWatchlist = async () => {
    if (!user) return;
    const { data } = await supabase.from("watchlist").select("content_id").eq("user_id", user.id);
    setWatchlistIds(new Set((data || []).map((w: any) => w.content_id)));
  };

  const toggleWatchlist = async (contentId: string) => {
    if (!user) { toast.error("Please sign in first"); return; }
    if (watchlistIds.has(contentId)) {
      await supabase.from("watchlist").delete().eq("user_id", user.id).eq("content_id", contentId);
      setWatchlistIds((prev) => { const n = new Set(prev); n.delete(contentId); return n; });
      toast.success("Removed from your list");
    } else {
      await supabase.from("watchlist").insert({ user_id: user.id, content_id: contentId });
      setWatchlistIds((prev) => new Set(prev).add(contentId));
      toast.success("Added to your list");
    }
  };

  const fetchTop10 = async () => {
    try {
      const ranking = await fetchTopContentRanking(10);
      setTop10Ids(ranking.map((item) => item.content_id));
    } catch (error) {
      console.error("Failed to load Top 10", error);
    }
  };

  useEffect(() => {
    void Promise.all([fetchContents(), fetchTop10()]);
  }, []);

  useEffect(() => {
    fetchWatchlist();
  }, [user]);

  // Filter out archived content for non-admin users
  const visibleContents = isAdmin ? contents : contents.filter((c) => !c.is_archived);

  const series = visibleContents.filter((c) => c.section === "series");
  const filmes = visibleContents.filter((c) => c.section === "filmes");
  const novelas = visibleContents.filter((c) => c.section === "novelas");
  const gl = visibleContents.filter((c) => c.section === "gl");
  const realities = visibleContents.filter((c) => c.section === "realities");

  const watchlistItems = visibleContents.filter((c) => watchlistIds.has(c.id));
  const top10Items = buildUniqueTopContent(visibleContents, top10Ids, 10);

  // Hero banners with rotation
  const heroBanners = getUniqueItemsByTitle(visibleContents.filter((c) => c.banner_url)).slice(0, 8);

  useEffect(() => {
    if (heroBanners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % heroBanners.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [heroBanners.length]);

  const currentHero = heroBanners[currentBanner % Math.max(heroBanners.length, 1)];

  const filteredContent = searchQuery.trim()
    ? visibleContents.filter((c) => c.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this?")) return;
    const { error } = await supabase.from("contents").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted!"); fetchContents(); }
  };

  const handleRemoveFromExclusives = async (item: ContentItem) => {
    if (!confirm("Remove from Exclusives? The title will stay in the catalog.")) return;
    const fallbackSection =
      item.type === "filme" ? "filmes" : item.type === "novela" ? "novelas" : "series";
    const { error } = await supabase
      .from("contents")
      .update({ section: fallbackSection })
      .eq("id", item.id);
    if (error) toast.error(error.message);
    else { toast.success("Removed from Exclusives"); fetchContents(); }
  };

  const handleEdit = (item: ContentItem) => {
    setEditingContent(item);
    setEditOpen(true);
  };

  const handleNew = (defaultSection?: string, defaultType?: string) => {
    setEditingContent(null);
    setNewDefaults({ section: defaultSection || "series", type: defaultType || "filme" });
    setEditOpen(true);
  };

  const trackClick = async (contentId: string) => {
    if (user) {
      await supabase.from("content_clicks").insert({ content_id: contentId, user_id: user.id });
    }
  };

  const goToPlans = (source: string) => {
    void trackSupporterClick(supabase, {
      source,
      user_id: user?.id ?? null,
    });
    navigate("/#planos-cards");
  };

  const menuItems = [
    { label: "Home", icon: "🏠", action: () => { setMenuOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); } },
    { label: "Series", icon: "📺", action: () => { setMenuOpen(false); document.getElementById("séries")?.scrollIntoView({ behavior: "smooth" }); } },
    { label: "Movies", icon: "🎬", action: () => { setMenuOpen(false); document.getElementById("filmes")?.scrollIntoView({ behavior: "smooth" }); } },
    { label: "Soap Operas", icon: "💕", action: () => { setMenuOpen(false); document.getElementById("novelas")?.scrollIntoView({ behavior: "smooth" }); } },
    { label: "GL Dramas", icon: "🌸", action: () => { setMenuOpen(false); document.getElementById("gl")?.scrollIntoView({ behavior: "smooth" }); } },
    { label: "Reality Shows", icon: "🎤", action: () => { setMenuOpen(false); document.getElementById("realities")?.scrollIntoView({ behavior: "smooth" }); } },

    
    { label: "My List", icon: "🔖", action: () => { setMenuOpen(false); document.getElementById("minha-lista")?.scrollIntoView({ behavior: "smooth" }); } },
    ...(!isAdmin && !userIsPremium ? [{ label: "Become a Supporter", icon: "👑", action: () => { setMenuOpen(false); goToPlans("browse_sidebar"); }, premium: true }] : []),
    { label: "Telegram Community", icon: "📣", action: () => { setMenuOpen(false); window.open("https://t.me/QueerScenesTv", "_blank", "noopener,noreferrer"); } },
    { label: "Support", icon: "💬", action: () => { setMenuOpen(false); setSupportOpen(true); } },
    { label: "Profile", icon: "👤", action: () => { setMenuOpen(false); setProfileOpen(true); } },
    ...(isAdmin ? [{ label: "Admin Panel", icon: "⚙️", action: () => { setMenuOpen(false); navigate("/admin"); } }] : []),
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-4 h-14 sm:h-16 flex items-center justify-between">
          <button onClick={() => setMenuOpen(!menuOpen)} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted transition-colors">
            {menuOpen ? <X className="w-5 h-5 text-foreground" /> : <Menu className="w-5 h-5 text-foreground" />}
          </button>

          <Link to="/" className="absolute left-1/2 -translate-x-1/2" style={{ fontFamily: "'Sora', sans-serif", fontSize: "13px", fontWeight: 700, letterSpacing: ".14em", color: "#a855f7", textShadow: "0 0 16px rgba(168,85,247,.4)" }}>
            QUEER SCENES
          </Link>


          <div className="flex items-center gap-2">
            {isAdmin && (
              <button onClick={() => handleNew()} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-primary/20 transition-colors" title="Add content">
                <Plus className="w-5 h-5 text-primary" />
              </button>
            )}
            {user && <MessagesPopover userId={user.id} isAdmin={isAdmin} />}
            <button onClick={() => setSearchOpen(!searchOpen)} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted transition-colors">
              <Search className="w-5 h-5 text-foreground" />
            </button>
          </div>
        </div>

        {/* Search bar */}
        <AnimatePresence>
          {searchOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-b border-border">
              <div className="max-w-7xl mx-auto px-4 py-3">
                <input autoFocus type="text" placeholder="Search series, movies..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-muted/50 border border-border rounded-full px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50" />
                {searchQuery.trim() && (
                  <div className="mt-2 space-y-1 max-h-60 overflow-y-auto">
                    {filteredContent.length > 0 ? (
                      filteredContent.map((c) => (
                        <button key={c.id} onClick={() => { navigate(`/player/${c.id}`); setSearchOpen(false); setSearchQuery(""); }} className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted/50 flex items-center gap-3 text-sm transition-colors">
                          <Play className="w-3 h-3 text-primary flex-shrink-0" />
                          <span className="text-foreground">{c.title}</span>
                          <span className="text-muted-foreground text-xs ml-auto">{c.tag}</span>
                        </button>
                      ))
                    ) : (
                      <p className="text-muted-foreground text-xs text-center py-3">No results found.</p>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="bg-card border-b border-border px-4 py-4 space-y-1">
              {menuItems.map((item: any) => (
                <button key={item.label} onClick={item.action} className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}

              {/* QueerScenes Social Media */}
              <div className="border-t border-border pt-3 mt-2">
                <p className="px-3 pb-2 qs-section-label">
                  QueerScenes Social Media
                </p>

                <div className="flex items-center gap-2 px-3 pb-1 flex-wrap">
                  {socialLinks.map(({ id, label, href, icon }) => {
                    const Icon = getSocialIcon(icon);
                    return (
                      <a
                        key={id}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={label}
                        aria-label={label}
                        className="w-9 h-9 flex items-center justify-center rounded-full bg-muted/50 hover:bg-primary/20 hover:text-primary text-muted-foreground transition-colors"
                      >
                        <Icon className="w-4 h-4" />
                      </a>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-border pt-2 mt-2">
                <button onClick={async () => { setMenuOpen(false); await signOut(); navigate("/"); }} className="qs-signout w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors">
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>

            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="pt-14 sm:pt-16">
        <TitlesTicker />

        {/* HERO BANNER - Rotating */}
        {heroBanners.length > 0 && (
        <section className="relative min-h-[70svh] sm:min-h-[80svh] flex items-end overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.img
              key={currentHero?.id}
              src={currentHero?.banner_url || "/placeholder.svg"}
              alt={currentHero?.title || "Featured banner"}
              className="absolute inset-0 w-full h-full object-cover bg-muted"
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2 }}
            />
          </AnimatePresence>
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/80 to-transparent" />
          <div className="relative z-10 p-6 sm:p-10 md:p-16 max-w-2xl">
            <AnimatePresence mode="wait">
              <motion.div key={currentHero?.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}>
                <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold mb-3 leading-tight">
                  {currentHero?.title || "Featured Production Title"}
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground mb-5 max-w-md line-clamp-3">
                  {currentHero?.synopsis || "A story of love, courage, and freedom."}
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={() => currentHero && navigate(`/player/${currentHero.id}`)} className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full glow-purple gap-2">
                    <Play className="w-4 h-4" /> Watch Now
                  </Button>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
          {/* Banner indicators */}
          {heroBanners.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
              {heroBanners.slice(0, 8).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentBanner(i)}
                  className={`w-2 h-2 rounded-full transition-all ${i === currentBanner % heroBanners.length ? 'bg-primary w-6' : 'bg-muted-foreground/40 hover:bg-muted-foreground/60'}`}
                />
              ))}
            </div>
          )}
        </section>
        )}

        <SiteNoteBanner />

        {/* TOP 10 - Netflix-style ranking */}
        {top10Items.length > 0 && (
          <section className="py-10 sm:py-16 px-4">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl sm:text-2xl font-black flex items-center gap-2">
                  <span>🔥</span>
                  <span className="rainbow-text">Top 10</span>
                </h2>
              </div>
              <div
                className="overflow-x-auto -mx-4 px-4 scroll-smooth snap-x snap-mandatory"
                style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
              >
                <div className="flex items-start gap-4 sm:gap-6 pb-4" style={{ width: "max-content" }}>
                  {top10Items.map((item, i) => {
                    const rank = i + 1;
                    return (
                      <article
                        key={`top10-${item.id}`}
                        className="qs-top10-card flex-shrink-0 snap-start cursor-pointer"
                        style={{ width: "clamp(120px, 34vw, 220px)" }}
                        onClick={() => { trackClick(item.id); navigate(`/title/${slugify(item.title)}`); }}
                      >
                        <div className="qs-top10-poster">
                          <img src={item.banner_url || "/placeholder.svg"} alt={item.title} loading="lazy" />
                          <div className="qs-top10-shade" />
                        </div>
                        <div className="qs-top10-foot">
                          <span className="qs-top10-bignum" aria-hidden>{rank}</span>
                          <div className="qs-top10-meta">
                            <p className="qs-top10-fname">{item.title}</p>
                            <p className="qs-top10-ftag">{item.year} · {item.type === "serie" ? "Series" : item.type === "novela" ? "Soap Opera" : item.type === "reality" ? "Reality Show" : "Movie"}</p>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
              
            </div>
          </section>
        )}

        <RecentUpdatesSection />

        <ContinueWatchingSection />




        {/* SERIES */}
        <section id="séries" className="py-10 sm:py-16 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6 gap-3">
              <h2 className="text-xl sm:text-2xl font-black neon-text-purple flex items-center gap-2">
                <span>🎭</span> Series
              </h2>
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <button onClick={() => handleNew("series", "serie")} className="w-9 h-9 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors" title="Add series">
                    <Plus className="w-5 h-5 text-primary" />
                  </button>
                )}
              </div>
            </div>
            {series.length > 0 ? (
              <AutoScrollRow>
                {series.map((s) => (
                  <div key={s.id} className="flex-shrink-0 w-[45vw] sm:w-[200px]">
                    <ContentCard item={s} isAdmin={isAdmin} onEdit={() => handleEdit(s)} onDelete={() => handleDelete(s.id)} onClickTrack={() => trackClick(s.id)} isInWatchlist={watchlistIds.has(s.id)} onToggleWatchlist={() => toggleWatchlist(s.id)} userIsPremium={userIsPremium} />
                  </div>
                ))}
              </AutoScrollRow>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                {isAdmin ? "Click + to add series" : "New content coming soon!"}
              </p>
            )}
          </div>
        </section>

        {/* MOVIES */}
        <section id="filmes" className="py-10 sm:py-16 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6 gap-3">
              <h2 className="text-xl sm:text-2xl font-black neon-text-dark-blue flex items-center gap-2">
                <span>🎬</span> Movies
              </h2>
              {isAdmin && (
                <button onClick={() => handleNew("filmes", "filme")} className="w-9 h-9 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors" title="Add movie">
                  <Plus className="w-5 h-5 text-primary" />
                </button>
              )}
            </div>
            {filmes.length > 0 ? (
              <AutoScrollRow>
                {filmes.map((f) => (
                  <div key={f.id} className="flex-shrink-0 w-[45vw] sm:w-[200px]">
                    <ContentCard item={f} isAdmin={isAdmin} onEdit={() => handleEdit(f)} onDelete={() => handleDelete(f.id)} onClickTrack={() => trackClick(f.id)} isInWatchlist={watchlistIds.has(f.id)} onToggleWatchlist={() => toggleWatchlist(f.id)} userIsPremium={userIsPremium} />
                  </div>
                ))}
              </AutoScrollRow>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                {isAdmin ? "Click + to add movies" : "New content coming soon!"}
              </p>
            )}
          </div>
        </section>


        {/* SOAP OPERAS */}
        <section id="novelas" className="py-10 sm:py-16 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6 gap-3">
              <h2 className="text-xl sm:text-2xl font-black neon-text-pink flex items-center gap-2">
                <span>🌶️</span> Queer Soap Operas
              </h2>
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <button onClick={() => handleNew("novelas", "novela")} className="w-9 h-9 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors" title="Add soap opera">
                    <Plus className="w-5 h-5 text-primary" />
                  </button>
                )}
              </div>
            </div>
            {novelas.length > 0 ? (
              <AutoScrollRow>
                {novelas.map((n) => (
                  <div key={n.id} className="flex-shrink-0 w-[45vw] sm:w-[200px]">
                    <ContentCard item={n} isAdmin={isAdmin} onEdit={() => handleEdit(n)} onDelete={() => handleDelete(n.id)} onClickTrack={() => trackClick(n.id)} isInWatchlist={watchlistIds.has(n.id)} onToggleWatchlist={() => toggleWatchlist(n.id)} userIsPremium={userIsPremium} />
                  </div>
                ))}
              </AutoScrollRow>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                {isAdmin ? "Click + to add soap operas" : "New content coming soon!"}
              </p>
            )}
          </div>
        </section>


        {/* GL DRAMAS */}
        <section id="gl" className="py-10 sm:py-16 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6 gap-3">
              <h2 className="text-xl sm:text-2xl font-black neon-text-purple flex items-center gap-2">
                <span>💜</span> GL Dramas
              </h2>
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <>
                    <button onClick={() => handleNew("gl", "serie")} className="h-9 px-3 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center gap-1.5 transition-colors text-xs font-medium text-primary" title="Add GL Series">
                      <Plus className="w-3.5 h-3.5" /> Series
                    </button>
                    <button onClick={() => handleNew("gl", "filme")} className="h-9 px-3 rounded-full bg-secondary/10 hover:bg-secondary/20 flex items-center gap-1.5 transition-colors text-xs font-medium text-secondary" title="Add GL Movie">
                      <Plus className="w-3.5 h-3.5" /> Movie
                    </button>
                  </>
                )}
              </div>
            </div>
            {gl.length > 0 ? (
              <AutoScrollRow>
                {gl.map((g) => (
                  <div key={g.id} className="flex-shrink-0 w-[45vw] sm:w-[200px]">
                    <ContentCard item={g} isAdmin={isAdmin} onEdit={() => handleEdit(g)} onDelete={() => handleDelete(g.id)} onClickTrack={() => trackClick(g.id)} isInWatchlist={watchlistIds.has(g.id)} onToggleWatchlist={() => toggleWatchlist(g.id)} userIsPremium={userIsPremium} />
                  </div>
                ))}
              </AutoScrollRow>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                {isAdmin ? "Click + to add GL Dramas" : "New content coming soon!"}
              </p>
            )}
          </div>
        </section>

        {/* REALITY SHOWS */}
        <section id="realities" className="py-10 sm:py-16 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6 gap-3">
              <h2 className="text-xl sm:text-2xl font-black neon-text-blue flex items-center gap-2">
                <span>🎤</span> Reality Shows
              </h2>
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <button onClick={() => handleNew("realities", "reality")} className="w-9 h-9 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors" title="Add reality show">
                    <Plus className="w-5 h-5 text-primary" />
                  </button>
                )}
              </div>
            </div>
            {realities.length > 0 ? (
              <AutoScrollRow>
                {realities.map((r) => (
                  <div key={r.id} className="flex-shrink-0 w-[45vw] sm:w-[200px]">
                    <ContentCard item={r} isAdmin={isAdmin} onEdit={() => handleEdit(r)} onDelete={() => handleDelete(r.id)} onClickTrack={() => trackClick(r.id)} isInWatchlist={watchlistIds.has(r.id)} onToggleWatchlist={() => toggleWatchlist(r.id)} userIsPremium={userIsPremium} />
                  </div>
                ))}
              </AutoScrollRow>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                {isAdmin ? "Click + to add reality shows" : "New content coming soon!"}
              </p>
            )}
          </div>
        </section>






        {/* MY LIST */}
        <section id="minha-lista" className="py-10 sm:py-16 px-4">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-xl sm:text-2xl font-black mb-6 flex items-center gap-2 neon-text-pink">
              <Bookmark className="w-5 h-5 sm:w-6 sm:h-6" /> My List
            </h2>
            {watchlistItems.length > 0 ? (
              <AutoScrollRow>
                {watchlistItems.map((w) => (
                  <div key={w.id} className="flex-shrink-0 w-[45vw] sm:w-[200px]">
                    <ContentCard item={w} isAdmin={isAdmin} onEdit={() => handleEdit(w)} onDelete={() => handleDelete(w.id)} onClickTrack={() => trackClick(w.id)} isInWatchlist={true} onToggleWatchlist={() => toggleWatchlist(w.id)} userIsPremium={userIsPremium} />
                  </div>
                ))}
              </AutoScrollRow>
            ) : (
              <p className="text-muted-foreground text-center py-12">Your list is empty. Click the + on cards to add!</p>
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        <p>© 2026 Queer Scenes. All rights reserved. 🌈</p>
      </footer>

      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
      <SupportDialog open={supportOpen} onOpenChange={setSupportOpen} />
      
      <EditContentDialog open={editOpen} onOpenChange={setEditOpen} content={editingContent} onSaved={fetchContents} defaults={newDefaults} />
      <AddExistingContentDialog open={addExistingOpen} onOpenChange={setAddExistingOpen} targetSection="exclusivos" onSaved={fetchContents} />

    </div>
  );
};

export default Browse;
