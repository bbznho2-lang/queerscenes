import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const TitlesTicker = () => {
  const [selected, setSelected] = useState<string | null>(null);
  const [contents, setContents] = useState<{ id: string; title: string }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const autoScrollRef = useRef<number | null>(null);
  const isHovering = useRef(false);

  useEffect(() => {
    supabase.from("contents").select("id, title").order("title").then(({ data }) => {
      setContents(data || []);
    });
  }, []);

  // Group titles by first letter
  const titlesByLetter: Record<string, { id: string; title: string }[]> = {};
  ALPHABET.forEach((l) => (titlesByLetter[l] = []));
  contents.forEach((c) => {
    const first = c.title.charAt(0).toUpperCase();
    if (titlesByLetter[first]) titlesByLetter[first].push(c);
  });

  // Auto-scroll the alphabet bar
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const startAutoScroll = () => {
      if (autoScrollRef.current) return;
      autoScrollRef.current = window.setInterval(() => {
        if (isHovering.current) return;
        if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 2) {
          el.scrollTo({ left: 0, behavior: "smooth" });
        } else {
          el.scrollBy({ left: 1, behavior: "auto" });
        }
      }, 30);
    };

    startAutoScroll();

    const handleTouch = () => { isHovering.current = true; };
    const handleTouchEnd = () => { setTimeout(() => { isHovering.current = false; }, 2000); };

    el.addEventListener("touchstart", handleTouch, { passive: true });
    el.addEventListener("touchend", handleTouchEnd, { passive: true });
    el.addEventListener("mouseenter", handleTouch);
    el.addEventListener("mouseleave", () => { isHovering.current = false; });

    return () => {
      if (autoScrollRef.current) clearInterval(autoScrollRef.current);
      el.removeEventListener("touchstart", handleTouch);
      el.removeEventListener("touchend", handleTouchEnd);
      el.removeEventListener("mouseenter", handleTouch);
      el.removeEventListener("mouseleave", () => {});
    };
  }, []);

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
                  className="px-3 py-1.5 rounded-full bg-muted/50 text-sm text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors border border-border hover:border-primary/40 active:scale-95"
                >
                  {item.title}
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
