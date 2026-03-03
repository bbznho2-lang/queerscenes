import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Plus, Menu, X, Search, User, Bookmark, LogOut, HeadphonesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProfileDialog from "@/components/ProfileDialog";
import SupportDialog from "@/components/SupportDialog";
import TitlesTicker from "@/components/TitlesTicker";

const SERIES = [
  { id: 1, title: "Amor em Cores", year: 2024, tag: "Romance", img: "/placeholder.svg" },
  { id: 2, title: "Vozes Livres", year: 2023, tag: "Drama", img: "/placeholder.svg" },
  { id: 3, title: "Brilho Próprio", year: 2024, tag: "Teen", img: "/placeholder.svg" },
  { id: 4, title: "Noites Queer", year: 2023, tag: "Comédia", img: "/placeholder.svg" },
  { id: 5, title: "Corações Rebeldes", year: 2024, tag: "Drama", img: "/placeholder.svg" },
  { id: 6, title: "Arco-Íris Urbano", year: 2023, tag: "Suspense", img: "/placeholder.svg" },
];

const FILMES = [
  { id: 7, title: "O Primeiro Beijo", year: 2022, tag: "Romance", img: "/placeholder.svg" },
  { id: 8, title: "Orgulho", year: 2014, tag: "Drama", img: "/placeholder.svg" },
  { id: 9, title: "Identidade", year: 2023, tag: "Documentário", img: "/placeholder.svg" },
  { id: 10, title: "Nas Estrelas", year: 2024, tag: "Ficção", img: "/placeholder.svg" },
  { id: 11, title: "Laços Invisíveis", year: 2021, tag: "Drama", img: "/placeholder.svg" },
  { id: 12, title: "Liberdade", year: 2023, tag: "Indie", img: "/placeholder.svg" },
  { id: 13, title: "Neon Nights", year: 2024, tag: "Thriller", img: "/placeholder.svg" },
  { id: 14, title: "Respira Fundo", year: 2022, tag: "Drama", img: "/placeholder.svg" },
];

const EXCLUSIVOS = [
  { id: 15, title: "QS Original: Raízes", year: 2025, tag: "Exclusivo", img: "/placeholder.svg" },
  { id: 16, title: "QS Original: Espelho", year: 2025, tag: "Exclusivo", img: "/placeholder.svg" },
  { id: 17, title: "QS Original: Pulso", year: 2025, tag: "Exclusivo", img: "/placeholder.svg" },
  { id: 18, title: "QS Original: Aurora", year: 2025, tag: "Exclusivo", img: "/placeholder.svg" },
];

interface ContentCardProps {
  item: { id: number; title: string; year: number; tag: string; img: string };
  large?: boolean;
}

const ContentCard = ({ item, large }: ContentCardProps) => {
  const navigate = useNavigate();
  return (
    <motion.div
      className={`group relative rounded-xl overflow-hidden cursor-pointer ${large ? "aspect-[3/4]" : "aspect-[2/3]"}`}
      whileHover={{ scale: 1.03 }}
      transition={{ duration: 0.2 }}
      onClick={() => navigate(`/player/${item.id}`)}
    >
      <img src={item.img} alt={item.title} className="w-full h-full object-cover bg-muted" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent opacity-80" />
      <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
        <span className="inline-block px-2 py-0.5 text-[10px] sm:text-xs rounded bg-primary/20 text-primary font-medium mb-1.5">
          {item.tag}
        </span>
        <h3 className="text-sm sm:text-base font-semibold text-foreground leading-tight">{item.title}</h3>
        <p className="text-xs text-muted-foreground">{item.year}</p>
      </div>
      <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <Button size="sm" className="bg-primary text-primary-foreground rounded-full glow-purple gap-1 opacity-0 group-hover:opacity-100 transition-opacity text-xs">
          <Play className="w-3 h-3" /> Assistir
        </Button>
      </div>
      <div className="absolute inset-0 rounded-xl border border-transparent group-hover:border-primary/50 group-hover:shadow-[0_0_20px_hsl(270_100%_50%/0.2)] transition-all pointer-events-none" />
    </motion.div>
  );
};

const Browse = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [myList] = useState<number[]>([1, 7, 15]);
  const navigate = useNavigate();

  const allContent = [...SERIES, ...FILMES, ...EXCLUSIVOS];
  const filteredContent = searchQuery.trim()
    ? allContent.filter((c) => c.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  const menuItems = [
    { label: "Início", icon: "🏠", action: () => { setMenuOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); } },
    { label: "Séries", icon: "📺", action: () => { setMenuOpen(false); document.getElementById("séries")?.scrollIntoView({ behavior: "smooth" }); } },
    { label: "Filmes", icon: "🎬", action: () => { setMenuOpen(false); document.getElementById("filmes")?.scrollIntoView({ behavior: "smooth" }); } },
    { label: "Exclusivos", icon: "⭐", action: () => { setMenuOpen(false); document.getElementById("exclusivos")?.scrollIntoView({ behavior: "smooth" }); } },
    { label: "Minha Lista", icon: "🔖", action: () => { setMenuOpen(false); document.getElementById("minha-lista")?.scrollIntoView({ behavior: "smooth" }); } },
    { label: "Perfil", icon: "👤", action: () => { setMenuOpen(false); setProfileOpen(true); } },
    { label: "Suporte", icon: "💬", action: () => { setMenuOpen(false); setSupportOpen(true); } },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-4 h-14 sm:h-16 flex items-center justify-between">
          {/* Left: Hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
          >
            {menuOpen ? <X className="w-5 h-5 text-foreground" /> : <Menu className="w-5 h-5 text-foreground" />}
          </button>

          {/* Center: Logo */}
          <Link
            to="/"
            className="absolute left-1/2 -translate-x-1/2 text-lg sm:text-xl font-bold neon-text-purple"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            QUEER SCENES
          </Link>

          {/* Right: Search */}
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
          >
            <Search className="w-5 h-5 text-foreground" />
          </button>
        </div>

        {/* Search bar */}
        <AnimatePresence>
          {searchOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-b border-border"
            >
              <div className="max-w-7xl mx-auto px-4 py-3">
                <input
                  autoFocus
                  type="text"
                  placeholder="Buscar séries, filmes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-muted/50 border border-border rounded-full px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                />
                {searchQuery.trim() && (
                  <div className="mt-2 space-y-1 max-h-60 overflow-y-auto">
                    {filteredContent.length > 0 ? (
                      filteredContent.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => { navigate(`/player/${c.id}`); setSearchOpen(false); setSearchQuery(""); }}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted/50 flex items-center gap-3 text-sm transition-colors"
                        >
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
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-card border-b border-border px-4 py-4 space-y-1"
            >
              {menuItems.map((item) => (
                <button
                  key={item.label}
                  onClick={item.action}
                  className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
              {/* Sair */}
              <div className="border-t border-border pt-2 mt-2">
                <button
                  onClick={() => { setMenuOpen(false); navigate("/"); }}
                  className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-accent hover:bg-accent/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sair</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="pt-14 sm:pt-16">
        {/* Ticker */}
        <TitlesTicker />

        {/* HERO BANNER */}
        <section id="início" className="relative h-[60vh] sm:h-[70vh] flex items-end">
          <img src="/placeholder.svg" alt="Banner principal" className="absolute inset-0 w-full h-full object-cover bg-muted" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/80 to-transparent" />
          <div className="relative z-10 p-6 sm:p-10 md:p-16 max-w-2xl">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold mb-3 leading-tight">
                Título da Produção em Destaque
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground mb-5 max-w-md">
                Uma história de amor, coragem e liberdade que vai transformar sua forma de ver o mundo.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full glow-purple gap-2">
                  <Play className="w-4 h-4" /> Assistir Agora
                </Button>
                <Button variant="outline" className="rounded-full neon-border-blue text-secondary hover:bg-secondary/10 gap-2">
                  <Plus className="w-4 h-4" /> Minha Lista
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* SÉRIES */}
        <section id="séries" className="py-10 sm:py-16 px-4">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold mb-6 neon-text-purple">Séries Queer em Alta</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
              {SERIES.map((s) => <ContentCard key={s.id} item={s} />)}
            </div>
          </div>
        </section>

        {/* FILMES */}
        <section id="filmes" className="py-10 sm:py-16 px-4">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold mb-6 neon-text-blue">Filmes Icônicos</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
              {FILMES.map((f) => <ContentCard key={f.id} item={f} />)}
            </div>
          </div>
        </section>

        {/* EXCLUSIVOS */}
        <section id="exclusivos" className="py-10 sm:py-16 px-4">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold mb-6">
              <span className="rainbow-text">Exclusivos Queer Scenes</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {EXCLUSIVOS.map((e) => <ContentCard key={e.id} item={e} large />)}
            </div>
          </div>
        </section>

        {/* MINHA LISTA */}
        <section id="minha-lista" className="py-10 sm:py-16 px-4">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold mb-6 flex items-center gap-2">
              <Bookmark className="w-6 h-6 text-secondary" /> Minha Lista
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
              {[...SERIES, ...FILMES, ...EXCLUSIVOS]
                .filter((c) => myList.includes(c.id))
                .map((c) => <ContentCard key={c.id} item={c} />)}
            </div>
            {myList.length === 0 && (
              <p className="text-muted-foreground text-center py-12">Sua lista está vazia. Adicione títulos para assistir depois!</p>
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        <p>© 2026 Queer Scenes. Todos os direitos reservados. 🌈</p>
      </footer>

      {/* Dialogs */}
      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
      <SupportDialog open={supportOpen} onOpenChange={setSupportOpen} />
    </div>
  );
};

export default Browse;
