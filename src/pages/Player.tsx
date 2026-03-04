import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { ArrowLeft, Play, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import EditContentDialog from "@/components/EditContentDialog";

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

interface Episode {
  id: string;
  content_id: string;
  title: string;
  episode_number: number;
  player_url: string | null;
}

const Player = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const isMobile = useIsMobile();
  const [content, setContent] = useState<ContentItem | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [currentEp, setCurrentEp] = useState<Episode | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const fetchContent = async () => {
    if (!id) return;
    const { data } = await supabase.from("contents").select("*").eq("id", id).single();
    if (data) {
      setContent(data);
      if (data.type === "serie") {
        const { data: eps } = await supabase.from("episodes").select("*").eq("content_id", id).order("episode_number");
        setEpisodes(eps || []);
        if (eps && eps.length > 0) setCurrentEp(eps[0]);
      }
    }
  };

  useEffect(() => {
    fetchContent();
  }, [id]);

  const rawPlayerUrl = currentEp?.player_url || content?.player_url;

  const getDriveEmbedUrl = (url: string) => {
    const fileMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
    if (fileMatch?.[1]) return `https://drive.google.com/file/d/${fileMatch[1]}/preview`;

    const idMatch = url.match(/[?&]id=([^&]+)/);
    if (url.includes("drive.google.com") && idMatch?.[1]) {
      return `https://drive.google.com/file/d/${idMatch[1]}/preview`;
    }

    return url;
  };

  const activePlayerUrl = rawPlayerUrl ? getDriveEmbedUrl(rawPlayerUrl) : rawPlayerUrl;
  const hasPlayerUrl = Boolean(activePlayerUrl);
  const iframeClassName = isMobile
    ? "absolute inset-0 w-full h-full border-0"
    : "absolute inset-0 w-full h-full border-0";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className={isMobile ? "flex items-center justify-between gap-3 p-2" : "flex items-center justify-between gap-3 p-3 sm:p-6 absolute top-0 left-0 right-0 z-10"}>
        <button
          onClick={() => navigate("/browse")}
          className={isMobile ? "w-7 h-7 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center hover:bg-card transition-colors" : "w-9 h-9 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center hover:bg-card transition-colors"}
        >
          <ArrowLeft className={isMobile ? "w-3.5 h-3.5 text-foreground" : "w-5 h-5 text-foreground"} />
        </button>
        {isAdmin && content && (
          <button onClick={() => setEditOpen(true)} className="hidden sm:flex w-9 h-9 rounded-full bg-card flex items-center justify-center hover:bg-primary/20 transition-colors neon-border-purple">
            <Pencil className="w-4 h-4 text-primary" />
          </button>
        )}
      </div>

      <div className={isMobile ? "w-full px-0 -mt-2" : "w-full flex-1 flex items-center justify-center px-4 pt-16 pb-8"}>
        <div className={isMobile ? "w-full" : "w-full max-w-5xl"}>
          <div className={isMobile ? "relative w-full aspect-video bg-card overflow-hidden" : "relative aspect-video bg-card rounded-2xl overflow-hidden neon-border-purple"}>
            {hasPlayerUrl ? (
              <iframe
                src={activePlayerUrl ?? undefined}
                title={content?.title ? `Player de ${content.title}` : "Player"}
                className={iframeClassName}
                allowFullScreen
                allow="autoplay *; encrypted-media *; fullscreen *"
                referrerPolicy="no-referrer"
                loading="lazy"
                style={{ border: 0 }}
              />
            ) : (
              <img
                src={content?.banner_url || "/placeholder.svg"}
                alt={content?.title ? `Capa de ${content.title}` : "Capa do conteúdo"}
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}
          </div>
        </div>
      </div>

      <div className="w-full max-w-5xl mx-auto px-4 sm:px-0 pb-8">
        <div className="mt-4 sm:mt-6">
          <h1 className="text-lg sm:text-2xl font-bold">{content?.title || "Carregando..."}</h1>
          <div className="flex flex-wrap gap-2 mt-2 sm:mt-3">
            <span className="px-2 py-0.5 text-xs rounded bg-primary/20 text-primary">{content?.tag}</span>
            <span className="px-2 py-0.5 text-xs rounded bg-secondary/20 text-secondary">{content?.year}</span>
            <span className="px-2 py-0.5 text-xs rounded bg-muted text-muted-foreground">{content?.type === "serie" ? "Série" : "Filme"}</span>
          </div>
        </div>

        {content?.type === "serie" && episodes.length > 0 && (
          <div className="mt-6 sm:mt-8 space-y-2">
            <h3 className="text-lg font-semibold mb-3">Episódios</h3>
            {episodes.map((ep) => (
              <button
                key={ep.id}
                onClick={() => setCurrentEp(ep)}
                className={`w-full text-left rounded-xl flex items-center transition-colors ${isMobile ? "px-3 py-2.5 gap-2.5" : "px-4 py-3 gap-3"} ${
                  currentEp?.id === ep.id ? "bg-primary/10 border border-primary/30" : "bg-card border border-border hover:border-primary/20"
                }`}
              >
                <span className={isMobile ? "w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[11px] font-bold text-foreground" : "w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-foreground"}>{ep.episode_number}</span>
                <span className={isMobile ? "text-xs text-foreground" : "text-sm text-foreground"}>{ep.title}</span>
                {currentEp?.id === ep.id && <Play className={isMobile ? "w-3 h-3 text-primary ml-auto" : "w-3 h-3 text-primary ml-auto"} />}
              </button>
            ))}
          </div>
        )}
      </div>

      {content && <EditContentDialog open={editOpen} onOpenChange={setEditOpen} content={content} onSaved={fetchContent} />}
    </div>
  );
};

export default Player;
