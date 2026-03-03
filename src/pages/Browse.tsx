import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Plus, Menu, X, Search, Bookmark, LogOut, Pencil, Trash2, Crown, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProfileDialog from "@/components/ProfileDialog";
import SupportDialog from "@/components/SupportDialog";
import TitlesTicker from "@/components/TitlesTicker";
import EditContentDialog from "@/components/EditContentDialog";
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
}

const ContentCard = ({
  item,
  isAdmin,
  onEdit,
  onDelete,
  onClickTrack,
  isInWatchlist,
  onToggleWatchlist,
}: {
  item: ContentItem;
  isAdmin: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onClickTrack: () => void;
  isInWatchlist: boolean;
  onToggleWatchlist: () => void;
}) => {
  const navigate = useNavigate();
  return (
    <motion.div
      className="group relative rounded-xl overflow-hidden cursor-pointer aspect-[2/3]"
      whileHover={{ scale: 1.03 }}
      transition={{ duration: 0.2 }}
      onClick={() => { onClickTrack(); navigate(`/player/${item.id}`); }}
    >
      <img
        src={item.banner_url || "/placeholder.svg"}
        alt={item.title}
        className="w-full h-full object-cover bg-muted"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent opacity-80" />
      {/* Premium badge */}
      {item.is_premium && (
        <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full bg-secondary/90 text-secondary-foreground text-[10px] font-bold flex items-center gap-1">
          <Crown className="w-3 h-3" /> PREMIUM
        </div>
      )}
      {/* Add to watchlist button */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleWatchlist(); }}
        className={`absolute top-2 ${isAdmin ? 'top-12' : 'top-2'} right-2 z-10 w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-colors ${
          isInWatchlist ? 'bg-primary text-primary-foreground' : 'bg-card/90 hover:bg-primary/20 text-primary'
        }`}
        title={isInWatchlist ? "Remover da lista" : "Adicionar à lista"}
      >
        {isInWatchlist ? <Bookmark className="w-3.5 h-3.5 fill-current" /> : <Plus className="w-3.5 h-3.5" />}
      </button>
      <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
        <span className="inline-block px-2 py-0.5 text-[10px] sm:text-xs rounded bg-primary/20 text-primary font-medium mb-1.5">
          {item.tag}
        </span>
        <h3 className="text-sm sm:text-base font-semibold text-foreground leading-tight">{item.title}</h3>
        <p className="text-xs text-muted-foreground">{item.year} · {item.type === "serie" ? "Série" : "Filme"}</p>
      </div>
      <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <Button size="sm" className="bg-primary text-primary-foreground rounded-full glow-purple gap-1 opacity-0 group-hover:opacity-100 transition-opacity text-xs">
          <Play className="w-3 h-3" /> Assistir
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
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

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
    if (!user) { toast.error("Faça login primeiro"); return; }
    if (watchlistIds.has(contentId)) {
      await supabase.from("watchlist").delete().eq("user_id", user.id).eq("content_id", contentId);
      setWatchlistIds((prev) => { const n = new Set(prev); n.delete(contentId); return n; });
      toast.success("Removido da sua lista");
    } else {
      await supabase.from("watchlist").insert({ user_id: user.id, content_id: contentId });
      setWatchlistIds((prev) => new Set(prev).add(contentId));
      toast.success("Adicionado à sua lista");
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
  const animes = contents.filter((c) => c.section === "animes");
  const documentarios = contents.filter((c) => c.section === "documentarios");
  const exclusivos = contents.filter((c) => c.section === "exclusivos");
  const watchlistItems = contents.filter((c) => watchlistIds.has(c.id));

  const filteredContent = searchQuery.trim()
    ? contents.filter((c) => c.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir?")) return;
    const { error } = await supabase.from("contents").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Excluído!"); fetchContents(); }
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
    { label: "Início", icon: "🏠", action: () => { setMenuOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); } },
    { label: "Séries", icon: "📺", action: () => { setMenuOpen(false); document.getElementById("séries")?.scrollIntoView({ behavior: "smooth" }); } },
    { label: "Filmes", icon: "🎬", action: () => { setMenuOpen(false); document.getElementById("filmes")?.scrollIntoView({ behavior: "smooth" }); } },
    { label: "Novelas", icon: "💕", action: () => { setMenuOpen(false); document.getElementById("novelas")?.scrollIntoView({ behavior: "smooth" }); } },
    { label: "Animes", icon: "🎌", action: () => { setMenuOpen(false); document.getElementById("animes")?.scrollIntoView({ behavior: "smooth" }); } },
    { label: "Documentários", icon: "🎥", action: () => { setMenuOpen(false); document.getElementById("documentarios")?.scrollIntoView({ behavior: "smooth" }); } },
    { label: "Exclusivos", icon: "⭐", action: () => { setMenuOpen(false); document.getElementById("exclusivos")?.scrollIntoView({ behavior: "smooth" }); } },
    { label: "Minha Lista", icon: "🔖", action: () => { setMenuOpen(false); document.getElementById("minha-lista")?.scrollIntoView({ behavior: "smooth" }); } },
    { label: "Perfil", icon: "👤", action: () => { setMenuOpen(false); setProfileOpen(true); } },
    { label: "Suporte", icon: "💬", action: () => { setMenuOpen(false); setSupportOpen(true); } },
    ...(isAdmin ? [{ label: "Painel Admin", icon: "⚙️", action: () => { setMenuOpen(false); navigate("/admin"); } }] : []),
    { label: "Entrar pro Premium", icon: "💎", action: () => { setMenuOpen(false); navigate("/#planos"); }, premium: true },
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
              <button onClick={() => handleNew()} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-primary/20 transition-colors" title="Adicionar conteúdo">
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
                <input autoFocus type="text" placeholder="Buscar séries, filmes..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-muted/50 border border-border rounded-full px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50" />
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
                      <p className="text-muted-foreground text-xs text-center py-3">Nenhum resultado encontrado.</p>
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
                  <span>Sair</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="pt-14 sm:pt-16">
        <TitlesTicker />

        {/* HERO BANNER */}
        <section className="relative h-[60vh] sm:h-[70vh] flex items-end">
          <img src={contents[0]?.banner_url || "/placeholder.svg"} alt="Banner principal" className="absolute inset-0 w-full h-full object-cover bg-muted" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/80 to-transparent" />
          <div className="relative z-10 p-6 sm:p-10 md:p-16 max-w-2xl">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold mb-3 leading-tight">
                {contents[0]?.title || "Título da Produção em Destaque"}
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground mb-5 max-w-md">
                Uma história de amor, coragem e liberdade que vai transformar sua forma de ver o mundo.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => contents[0] && navigate(`/player/${contents[0].id}`)} className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full glow-purple gap-2">
                  <Play className="w-4 h-4" /> Assistir Agora
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* SÉRIES */}
        <section id="séries" className="py-10 sm:py-16 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold neon-text-purple">Séries Queer em Alta</h2>
              {isAdmin && (
                <button onClick={() => handleNew("series", "serie")} className="w-9 h-9 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors" title="Adicionar série">
                  <Plus className="w-5 h-5 text-primary" />
                </button>
              )}
            </div>
            {series.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                {series.map((s) => (
                  <ContentCard key={s.id} item={s} isAdmin={isAdmin} onEdit={() => handleEdit(s)} onDelete={() => handleDelete(s.id)} onClickTrack={() => trackClick(s.id)} isInWatchlist={watchlistIds.has(s.id)} onToggleWatchlist={() => toggleWatchlist(s.id)} />
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                {isAdmin ? "Clique no + para adicionar séries" : "Em breve novos conteúdos!"}
              </p>
            )}
          </div>
        </section>

        {/* FILMES */}
        <section id="filmes" className="py-10 sm:py-16 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold neon-text-blue">Filmes Icônicos</h2>
              {isAdmin && (
                <button onClick={() => handleNew("filmes", "filme")} className="w-9 h-9 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors" title="Adicionar filme">
                  <Plus className="w-5 h-5 text-primary" />
                </button>
              )}
            </div>
            {filmes.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                {filmes.map((f) => (
                  <ContentCard key={f.id} item={f} isAdmin={isAdmin} onEdit={() => handleEdit(f)} onDelete={() => handleDelete(f.id)} onClickTrack={() => trackClick(f.id)} isInWatchlist={watchlistIds.has(f.id)} onToggleWatchlist={() => toggleWatchlist(f.id)} />
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                {isAdmin ? "Clique no + para adicionar filmes" : "Em breve novos conteúdos!"}
              </p>
            )}
          </div>
        </section>

        {/* NOVELAS */}
        <section id="novelas" className="py-10 sm:py-16 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold neon-text-purple">Novelas Queer</h2>
              {isAdmin && (
                <button onClick={() => handleNew("novelas", "serie")} className="w-9 h-9 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors" title="Adicionar novela">
                  <Plus className="w-5 h-5 text-primary" />
                </button>
              )}
            </div>
            {novelas.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                {novelas.map((n) => (
                  <ContentCard key={n.id} item={n} isAdmin={isAdmin} onEdit={() => handleEdit(n)} onDelete={() => handleDelete(n.id)} onClickTrack={() => trackClick(n.id)} isInWatchlist={watchlistIds.has(n.id)} onToggleWatchlist={() => toggleWatchlist(n.id)} />
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                {isAdmin ? "Clique no + para adicionar novelas" : "Em breve novos conteúdos!"}
              </p>
            )}
          </div>
        </section>

        {/* ANIMES */}
        <section id="animes" className="py-10 sm:py-16 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold neon-text-blue">Animes Queer</h2>
              {isAdmin && (
                <button onClick={() => handleNew("animes", "serie")} className="w-9 h-9 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors" title="Adicionar anime">
                  <Plus className="w-5 h-5 text-primary" />
                </button>
              )}
            </div>
            {animes.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                {animes.map((a) => (
                  <ContentCard key={a.id} item={a} isAdmin={isAdmin} onEdit={() => handleEdit(a)} onDelete={() => handleDelete(a.id)} onClickTrack={() => trackClick(a.id)} isInWatchlist={watchlistIds.has(a.id)} onToggleWatchlist={() => toggleWatchlist(a.id)} />
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                {isAdmin ? "Clique no + para adicionar animes" : "Em breve novos conteúdos!"}
              </p>
            )}
          </div>
        </section>

        {/* DOCUMENTÁRIOS */}
        <section id="documentarios" className="py-10 sm:py-16 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold">Documentários</h2>
              {isAdmin && (
                <button onClick={() => handleNew("documentarios", "filme")} className="w-9 h-9 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors" title="Adicionar documentário">
                  <Plus className="w-5 h-5 text-primary" />
                </button>
              )}
            </div>
            {documentarios.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                {documentarios.map((d) => (
                  <ContentCard key={d.id} item={d} isAdmin={isAdmin} onEdit={() => handleEdit(d)} onDelete={() => handleDelete(d.id)} onClickTrack={() => trackClick(d.id)} isInWatchlist={watchlistIds.has(d.id)} onToggleWatchlist={() => toggleWatchlist(d.id)} />
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                {isAdmin ? "Clique no + para adicionar documentários" : "Em breve novos conteúdos!"}
              </p>
            )}
          </div>
        </section>

        <section id="exclusivos" className="py-10 sm:py-16 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold">
                <span className="rainbow-text">Exclusivos Queer Scenes</span>
              </h2>
              {isAdmin && (
                <button onClick={() => handleNew("exclusivos", "filme")} className="w-9 h-9 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors" title="Adicionar exclusivo">
                  <Plus className="w-5 h-5 text-primary" />
                </button>
              )}
            </div>
            {exclusivos.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {exclusivos.map((e) => (
                  <ContentCard key={e.id} item={e} isAdmin={isAdmin} onEdit={() => handleEdit(e)} onDelete={() => handleDelete(e.id)} onClickTrack={() => trackClick(e.id)} isInWatchlist={watchlistIds.has(e.id)} onToggleWatchlist={() => toggleWatchlist(e.id)} />
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                {isAdmin ? "Clique no + para adicionar exclusivos" : "Em breve novos conteúdos!"}
              </p>
            )}
          </div>
        </section>

        {/* MINHA LISTA */}
        <section id="minha-lista" className="py-10 sm:py-16 px-4">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold mb-6 flex items-center gap-2">
              <Bookmark className="w-6 h-6 text-secondary" /> Minha Lista
            </h2>
            {watchlistItems.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                {watchlistItems.map((w) => (
                  <ContentCard key={w.id} item={w} isAdmin={isAdmin} onEdit={() => handleEdit(w)} onDelete={() => handleDelete(w.id)} onClickTrack={() => trackClick(w.id)} isInWatchlist={true} onToggleWatchlist={() => toggleWatchlist(w.id)} />
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-12">Sua lista está vazia. Clique no + nos cards para adicionar!</p>
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        <p>© 2026 Queer Scenes. Todos os direitos reservados. 🌈</p>
      </footer>

      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
      <SupportDialog open={supportOpen} onOpenChange={setSupportOpen} />
      <EditContentDialog open={editOpen} onOpenChange={setEditOpen} content={editingContent} onSaved={fetchContents} defaults={newDefaults} />
    </div>
  );
};

export default Browse;
