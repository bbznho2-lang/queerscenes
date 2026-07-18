import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { slugify } from "@/lib/slug";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const TitlesTicker = () => {
  const [selected, setSelected] = useState<string | null>(null);
  const [contents, setContents] = useState<{ id: string; title: string; synopsis: string | null }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase
      .from("contents")
      .select("id, title, synopsis")
      .eq("is_archived", false)
      .order("title")
      .then(({ data }) => {
        setContents(data || []);
      });
  }, []);

  // Group titles by first letter
  const titlesByLetter: Record<string, { id: string; title: string; synopsis: string | null }[]> = {};
  ALPHABET.forEach((l) => (titlesByLetter[l] = []));
  contents.forEach((c) => {
    const first = c.title.charAt(0).toUpperCase();
    if (titlesByLetter[first]) titlesByLetter[first].push(c);
  });

  const titles = selected ? titlesByLetter[selected] || [] : [];

  return (
    <div className="border-b border-border bg-card/50">
      {/* Alphabet bar - auto scrolling */}
      <div
        ref={scrollRef}
        className="flex overflow-x-auto gap-1 px-3 py-2 scrollbar-hide"
        style={{ scrollbarWidth: "none" }}
      >
        {ALPHABET.map((letter) => {
          const hasTitles = titlesByLetter[letter].length > 0;
          const isSelected = selected === letter;
          return (
            <button
              key={letter}
              onClick={() => setSelected(isSelected ? null : letter)}
              className={`flex-shrink-0 w-9 h-9 rounded-lg text-xs font-bold transition-all ${
                isSelected
                  ? "bg-primary text-primary-foreground glow-purple scale-110"
                  : hasTitles
                  ? "bg-muted/50 text-foreground hover:bg-primary/20 hover:text-primary active:scale-95"
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
            <div className="px-3 py-3 flex flex-wrap gap-2">
              {titles.map((item) => (
                <button
                  key={item.id}
                  onClick={() => navigate(`/player/${item.id}`)}
                  className="flex flex-col items-start px-3 py-2 rounded-xl bg-muted/50 text-left hover:bg-primary/10 transition-colors border border-border hover:border-primary/40 active:scale-95 max-w-[200px]"
                >
                  <span className="text-sm font-medium text-foreground">{item.title}</span>
                  {item.synopsis && (
                    <span className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5 leading-snug">{item.synopsis}</span>
                  )}
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
