import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

const ALL_TITLES: Record<string, string[]> = {
  A: ["Amor em Cores", "Arco-Íris Urbano"],
  B: ["Brilho Próprio", "Blue is the Warmest Color"],
  C: ["Corações Rebeldes", "Carol", "Call Me by Your Name"],
  D: ["Disobedience"],
  E: ["Elite", "Euphoria", "Estranho Amor"],
  F: ["Firebird"],
  G: ["Garotas Malvadas"],
  H: ["Heartstopper", "Hoje Eu Quero Voltar Sozinho"],
  I: ["Identidade"],
  J: ["Juno"],
  K: ["Kiss Me"],
  L: ["Liberdade", "Laços Invisíveis", "La Vie d'Adèle"],
  M: ["Moonlight", "My Beautiful Laundrette"],
  N: ["Noites Queer", "Neon Nights", "Nas Estrelas"],
  O: ["Orgulho", "O Primeiro Beijo"],
  P: ["Pose", "Pride", "Portrait of a Lady on Fire"],
  Q: ["QS: Raízes", "QS: Espelho", "QS: Pulso", "QS: Aurora"],
  R: ["Respira Fundo"],
  S: ["Sex Education", "Saving Face", "Supernova"],
  T: ["The Half of It", "Thelma"],
  U: ["Un Año Sin Lluvia"],
  V: ["Vozes Livres", "Vida Real"],
  W: ["Weekend"],
  X: [],
  Y: ["Young Royals"],
  Z: [],
};

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const TitlesTicker = () => {
  const [selected, setSelected] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const titles = selected ? ALL_TITLES[selected] || [] : [];

  return (
    <div className="border-b border-border bg-card/50">
      {/* Alphabet bar */}
      <div
        ref={scrollRef}
        className="flex overflow-x-auto gap-1 px-3 py-2.5 scrollbar-hide"
        style={{ scrollbarWidth: "none" }}
      >
        {ALPHABET.map((letter) => {
          const hasTitles = (ALL_TITLES[letter] || []).length > 0;
          const isSelected = selected === letter;
          return (
            <button
              key={letter}
              onClick={() => setSelected(isSelected ? null : letter)}
              className={`flex-shrink-0 w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                isSelected
                  ? "bg-primary text-primary-foreground glow-purple"
                  : hasTitles
                  ? "bg-muted/50 text-foreground hover:bg-primary/20 hover:text-primary"
                  : "bg-muted/20 text-muted-foreground/40 cursor-default"
              }`}
              disabled={!hasTitles}
            >
              {letter}
            </button>
          );
        })}
      </div>

      {/* Titles dropdown */}
      <AnimatePresence>
        {selected && titles.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border"
          >
            <div className="px-4 py-3 flex flex-wrap gap-2">
              {titles.map((title, i) => (
                <button
                  key={i}
                  onClick={() => navigate(`/player/${i + 1}`)}
                  className="px-3 py-1.5 rounded-full bg-muted/50 text-sm text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors border border-border hover:border-primary/40"
                >
                  {title}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TitlesTicker;
