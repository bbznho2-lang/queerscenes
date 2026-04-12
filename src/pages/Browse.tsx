import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Plus, Menu, X, Search, Bookmark, LogOut, Pencil, Trash2, Crown, Settings, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import ProfileDialog from "@/components/ProfileDialog";
import SupportDialog from "@/components/SupportDialog";
import TitlesTicker from "@/components/TitlesTicker";
import EditContentDialog from "@/components/EditContentDialog";
import AddExistingContentDialog from "@/components/AddExistingContentDialog";
import AutoScrollRow from "@/components/AutoScrollRow";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ContentItem {
  id: string;
  title: string;
  year: number;
  tag: string;
  type: string;
  banner_url: string | null;
  player_url: string | null;
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
}: {
  item: ContentItem;
  isAdmin: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onClickTrack: () => void;
  isInWatchlist: boolean;
  onToggleWatchlist: () => void;
  userIsPremium: boolean;
}) => {
  const navigate = useNavigate();
  const handleClick = () => {
    if (item.is_premium && !isAdmin && !userIsPremium) {
      toast.error("This content is exclusive to Premium subscribers. Subscribe to a plan to watch!");
      navigate("/#planos");

      return;
    }
    onClickTrack();
    navigate(`/player/${item.id}`);
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
      {item.is_premium && (
        <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full bg-secondary/90 text-secondary-foreground text-[10px] font-bold flex items-center gap-1">
          <Crown className="w-3 h-3" /> PREMIUM
        </div>
      )}
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
        <p className="text-xs text-muted-foreground">{item.year} · {item.type === "serie" ? "Series" : item.type === "novela" ? "Soap Opera" : "Movie"}</p>
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
  const [premiumPopupOpen, setPremiumPopupOpen] = useState(false);
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
        // Show premium popup once per session for non-premium, non-admin users
        if (!isPrem && !isAdmin) {
          const shown = sessionStorage.getItem("premium_popup_shown");
          if (!shown) {
            setPremiumPopupOpen(true);
            sessionStorage.setItem("premium_popup_shown", "1");
          }
        }
      }
    };
    fetchPremium();
  }, [user, isAdmin]);

  const fetchContents = async () => {
    const { data } = await supabase
      .from("contents")
      .select("*")
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

  useEffect(() => {
    fetchContents();
  }, []);

  useEffect(() => {
    fetchWatchlist();
  }, [user]);

  const series = contents.filter((c) => c.section === "series");
  const filmes = contents.filter((c) => c.section === "filmes");
  const novelas = contents.filter((c) => c.section === "novelas");
  
  
  const exclusivos = contents.filter((c) => c.section === "exclusivos");
  const watchlistItems = contents.filter((c) => watchlistIds.has(c.id));

  const filteredContent = searchQuery.trim()
    ? contents.filter((c) => c.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this?")) return;
    const { error } = await supabase.from("contents").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted!"); fetchContents(); }
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

  const menuItems = [
    { label: "Home", icon: "🏠", action: () => { setMenuOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); } },
    { label: "Series", icon: "📺", action: () => { setMenuOpen(false); document.getElementById("séries")?.scrollIntoView({ behavior: "smooth" }); } },
    { label: "Movies", icon: "🎬", action: () => { setMenuOpen(false); document.getElementById("filmes")?.scrollIntoView({ behavior: "smooth" }); } },
    { label: "Soap Operas", icon: "💕", action: () => { setMenuOpen(false); document.getElementById("novelas")?.scrollIntoView({ behavior: "smooth" }); } },
    
    { label: "Exclusives", icon: "⭐", action: () => { setMenuOpen(false); document.getElementById("exclusivos")?.scrollIntoView({ behavior: "smooth" }); } },
    { label: "My List", icon: "🔖", action: () => { setMenuOpen(false); document.getElementById("minha-lista")?.scrollIntoView({ behavior: "smooth" }); } },
    { label: "Profile", icon: "👤", action: () => { setMenuOpen(false); setProfileOpen(true); } },
    { label: "Support", icon: "💬", action: () => { setMenuOpen(false); setSupportOpen(true); } },
    ...(isAdmin ? [{ label: "Admin Panel", icon: "⚙️", action: () => { setMenuOpen(false); navigate("/admin"); } }] : []),
    ...(!isAdmin && !userIsPremium ? [{ label: "Go Premium", icon: "💎", action: () => { setMenuOpen(false); navigate("/"); setTimeout(() => document.getElementById("planos")?.scrollIntoView({ behavior: "smooth" }), 300); }, premium: true }] : []),
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-4 h-14 sm:h-16 flex items-center justify-between">
          <button onClick={() => setMenuOpen(!menuOpen)} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted transition-colors">
            {menuOpen ? <X className="w-5 h-5 text-foreground" /> : <Menu className="w-5 h-5 text-foreground" />}
          </button>

          <Link to="/" className="absolute left-1/2 -translate-x-1/2 text-lg sm:text-xl font-bold neon-text-purple" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            QUEER SCENES
          </Link>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <button onClick={() => handleNew()} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-primary/20 transition-colors" title="Add content">
                <Plus className="w-5 h-5 text-primary" />
              </button>
            )}
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
              <div className="border-t border-border pt-2 mt-2">
                <button onClick={async () => { setMenuOpen(false); await signOut(); navigate("/"); }} className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-accent hover:bg-accent/10 transition-colors">
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

        {/* HERO BANNER */}
        {contents.length > 0 && (
        <section className="relative h-[60vh] sm:h-[70vh] flex items-end">
          <img key={contents[0]?.id} src={contents[0]?.banner_url || "/placeholder.svg"} alt="Main banner" className="absolute inset-0 w-full h-full object-cover bg-muted" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/80 to-transparent" />
          <div className="relative z-10 p-6 sm:p-10 md:p-16 max-w-2xl">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold mb-3 leading-tight">
                {contents[0]?.title || "Featured Production Title"}
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground mb-5 max-w-md line-clamp-3">
                {contents[0]?.synopsis || "A story of love, courage, and freedom that will transform the way you see the world."}
              </p>
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => contents[0] && navigate(`/player/${contents[0].id}`)} className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full glow-purple gap-2">
                  <Play className="w-4 h-4" /> Watch Now
                </Button>
              </div>
            </motion.div>
          </div>
        </section>
        )}

        {/* SERIES */}
        <section id="séries" className="py-10 sm:py-16 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold neon-text-purple">Trending Queer Series</h2>
              {isAdmin && (
                <button onClick={() => handleNew("series", "serie")} className="w-9 h-9 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors" title="Add series">
                  <Plus className="w-5 h-5 text-primary" />
                </button>
              )}
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
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold neon-text-blue">Iconic Movies</h2>
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
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold neon-text-purple">Queer Soap Operas</h2>
              {isAdmin && (
                <button onClick={() => handleNew("novelas", "novela")} className="w-9 h-9 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors" title="Add soap opera">
                  <Plus className="w-5 h-5 text-primary" />
                </button>
              )}
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




        {/* EXCLUSIVES */}
        <section id="exclusivos" className="py-10 sm:py-16 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold">
                <span className="rainbow-text">Queer Scenes Exclusives</span>
              </h2>
              {isAdmin && (
                <div className="flex items-center gap-2">
                  <button onClick={() => setAddExistingOpen(true)} className="h-9 px-3 rounded-full bg-secondary/10 hover:bg-secondary/20 flex items-center gap-1.5 transition-colors text-xs font-medium text-secondary" title="Adicionar título existente">
                    <Search className="w-3.5 h-3.5" /> Existente
                  </button>
                  <button onClick={() => handleNew("exclusivos", "filme")} className="w-9 h-9 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors" title="Criar novo exclusivo">
                    <Plus className="w-5 h-5 text-primary" />
                  </button>
                </div>
              )}
            </div>
            {exclusivos.length > 0 ? (
              <AutoScrollRow>
                {exclusivos.map((e) => (
                  <div key={e.id} className="flex-shrink-0 w-[45vw] sm:w-[200px]">
                    <ContentCard item={e} isAdmin={isAdmin} onEdit={() => handleEdit(e)} onDelete={() => handleDelete(e.id)} onClickTrack={() => trackClick(e.id)} isInWatchlist={watchlistIds.has(e.id)} onToggleWatchlist={() => toggleWatchlist(e.id)} userIsPremium={userIsPremium} />
                  </div>
                ))}
              </AutoScrollRow>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                {isAdmin ? "Click + to add exclusives" : "New content coming soon!"}
              </p>
            )}
          </div>
        </section>

        {/* MY LIST */}
        <section id="minha-lista" className="py-10 sm:py-16 px-4">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold mb-6 flex items-center gap-2">
              <Bookmark className="w-6 h-6 text-secondary" /> My List
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

      {/* Premium Upgrade Popup */}
      <Dialog open={premiumPopupOpen} onOpenChange={setPremiumPopupOpen}>
        <DialogContent className="sm:max-w-md bg-card border-primary/30">
          <DialogHeader className="text-center items-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Crown className="w-8 h-8 text-primary" />
            </div>
            <DialogTitle className="text-2xl neon-text-purple">Go Premium! 🌈</DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm mt-2">
              Unlock all exclusive content, early releases, and much more with a Premium plan!
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {[
              { icon: Sparkles, text: "All Premium content unlocked" },
              { icon: Play, text: "Early releases before everyone" },
              { icon: Crown, text: "Request what you want to watch" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                <item.icon className="w-4 h-4 text-primary shrink-0" />
                <span className="text-sm text-foreground">{item.text}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2 mt-4">
            <Button
              onClick={() => { setPremiumPopupOpen(false); navigate("/"); setTimeout(() => document.getElementById("planos")?.scrollIntoView({ behavior: "smooth" }), 300); }}
              className="w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90 glow-purple"
            >
              <Crown className="w-4 h-4 mr-2" /> View Plans
            </Button>
            <Button
              variant="ghost"
              onClick={() => setPremiumPopupOpen(false)}
              className="w-full text-muted-foreground text-sm"
            >
              Maybe later
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Browse;
