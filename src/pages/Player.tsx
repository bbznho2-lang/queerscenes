import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { ArrowLeft, Play, Pause, Volume2, VolumeX, Maximize, SkipBack, SkipForward, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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
  const [content, setContent] = useState<ContentItem | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [currentEp, setCurrentEp] = useState<Episode | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(35);
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

  useEffect(() => { fetchContent(); }, [id]);

  const activePlayerUrl = currentEp?.player_url || content?.player_url;
  const isEmbed = activePlayerUrl && (activePlayerUrl.includes("youtube") || activePlayerUrl.includes("vimeo") || activePlayerUrl.includes("embed") || activePlayerUrl.includes("iframe"));

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex items-center justify-between gap-3 p-4 sm:p-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-sm text-muted-foreground">Voltar ao catálogo</span>
        </div>
        {isAdmin && content && (
          <button onClick={() => setEditOpen(true)} className="w-9 h-9 rounded-full bg-card flex items-center justify-center hover:bg-primary/20 transition-colors neon-border-purple">
            <Pencil className="w-4 h-4 text-primary" />
          </button>
        )}
      </div>

      <div className="flex-1 flex items-center justify-center px-4 pb-8">
        <div className="w-full max-w-5xl">
          {/* Video area */}
          <div className="relative aspect-video bg-card rounded-2xl overflow-hidden neon-border-purple">
            {activePlayerUrl ? (
              <iframe
                src={activePlayerUrl}
                className="w-full h-full"
                allowFullScreen
                allow="autoplay; encrypted-media"
                frameBorder="0"
              />
            ) : (
              <>
                <img src={content?.banner_url || "/placeholder.svg"} alt="Player" className="w-full h-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <button onClick={() => setPlaying(!playing)} className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary/80 backdrop-blur-sm flex items-center justify-center glow-purple hover:bg-primary transition-colors">
                    {playing ? <Pause className="w-7 h-7 text-primary-foreground" /> : <Play className="w-7 h-7 text-primary-foreground ml-1" />}
                  </button>
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/90 to-transparent p-4 sm:p-6">
                  <div className="w-full h-1.5 bg-muted rounded-full mb-4 cursor-pointer group" onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setProgress(((e.clientX - rect.left) / rect.width) * 100);
                  }}>
                    <div className="h-full rounded-full bg-primary relative transition-all" style={{ width: `${progress}%` }}>
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary glow-purple opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button onClick={() => setPlaying(!playing)} className="text-foreground hover:text-primary transition-colors">
                        {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                      </button>
                      <button className="text-foreground hover:text-primary transition-colors"><SkipBack className="w-4 h-4" /></button>
                      <button className="text-foreground hover:text-primary transition-colors"><SkipForward className="w-4 h-4" /></button>
                      <button onClick={() => setMuted(!muted)} className="text-foreground hover:text-primary transition-colors">
                        {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      </button>
                    </div>
                    <button className="text-foreground hover:text-primary transition-colors"><Maximize className="w-4 h-4" /></button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Info */}
          <div className="mt-6">
            <h1 className="text-xl sm:text-2xl font-bold">{content?.title || "Carregando..."}</h1>
            <div className="flex gap-2 mt-3">
              <span className="px-2 py-0.5 text-xs rounded bg-primary/20 text-primary">{content?.tag}</span>
              <span className="px-2 py-0.5 text-xs rounded bg-secondary/20 text-secondary">{content?.year}</span>
              <span className="px-2 py-0.5 text-xs rounded bg-muted text-muted-foreground">{content?.type === "serie" ? "Série" : "Filme"}</span>
            </div>
          </div>

          {/* Episodes list */}
          {content?.type === "serie" && episodes.length > 0 && (
            <div className="mt-8 space-y-2">
              <h3 className="text-lg font-semibold mb-3">Episódios</h3>
              {episodes.map((ep) => (
                <button
                  key={ep.id}
                  onClick={() => setCurrentEp(ep)}
                  className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 transition-colors ${
                    currentEp?.id === ep.id
                      ? "bg-primary/10 border border-primary/30"
                      : "bg-card border border-border hover:border-primary/20"
                  }`}
                >
                  <span className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-foreground">
                    {ep.episode_number}
                  </span>
                  <span className="text-sm text-foreground">{ep.title}</span>
                  {currentEp?.id === ep.id && <Play className="w-3 h-3 text-primary ml-auto" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {content && (
        <EditContentDialog open={editOpen} onOpenChange={setEditOpen} content={content} onSaved={fetchContent} />
      )}
    </div>
  );
};

export default Player;
