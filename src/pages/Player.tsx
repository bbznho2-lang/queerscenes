import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { ArrowLeft, Play, Pause, Volume2, VolumeX, Maximize, SkipBack, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";

const Player = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(35);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-3 p-4 sm:p-6">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="text-sm text-muted-foreground">Voltar ao catálogo</span>
      </div>

      {/* Player area */}
      <div className="flex-1 flex items-center justify-center px-4 pb-8">
        <div className="w-full max-w-5xl">
          {/* Video placeholder */}
          <div className="relative aspect-video bg-card rounded-2xl overflow-hidden neon-border-purple">
            <img src="/placeholder.svg" alt="Player" className="w-full h-full object-cover" />
            
            {/* Center play button */}
            <div className="absolute inset-0 flex items-center justify-center">
              <button
                onClick={() => setPlaying(!playing)}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary/80 backdrop-blur-sm flex items-center justify-center glow-purple hover:bg-primary transition-colors"
              >
                {playing ? <Pause className="w-7 h-7 text-primary-foreground" /> : <Play className="w-7 h-7 text-primary-foreground ml-1" />}
              </button>
            </div>

            {/* Bottom controls */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/90 to-transparent p-4 sm:p-6">
              {/* Progress bar */}
              <div className="w-full h-1.5 bg-muted rounded-full mb-4 cursor-pointer group" onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setProgress(((e.clientX - rect.left) / rect.width) * 100);
              }}>
                <div
                  className="h-full rounded-full bg-primary relative transition-all"
                  style={{ width: `${progress}%` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary glow-purple opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={() => setPlaying(!playing)} className="text-foreground hover:text-primary transition-colors">
                    {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  </button>
                  <button className="text-foreground hover:text-primary transition-colors">
                    <SkipBack className="w-4 h-4" />
                  </button>
                  <button className="text-foreground hover:text-primary transition-colors">
                    <SkipForward className="w-4 h-4" />
                  </button>
                  <button onClick={() => setMuted(!muted)} className="text-foreground hover:text-primary transition-colors">
                    {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <span className="text-xs text-muted-foreground hidden sm:block">12:45 / 35:20</span>
                </div>
                <button className="text-foreground hover:text-primary transition-colors">
                  <Maximize className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="mt-6">
            <h1 className="text-xl sm:text-2xl font-bold">Título da Produção</h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-xl">
              Uma história envolvente sobre identidade, amor e aceitação. Acompanhe personagens que desafiam o convencional em busca de autenticidade.
            </p>
            <div className="flex gap-2 mt-3">
              <span className="px-2 py-0.5 text-xs rounded bg-primary/20 text-primary">Drama</span>
              <span className="px-2 py-0.5 text-xs rounded bg-secondary/20 text-secondary">2024</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Player;
