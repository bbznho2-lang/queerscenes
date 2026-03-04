import { useRef, useEffect, useState } from "react";

interface Props {
  children: React.ReactNode;
  speed?: number; // pixels per tick
}

const AutoScrollRow = ({ children, speed = 1 }: Props) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isPaused = useRef(false);
  const [canScroll, setCanScroll] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const check = () => setCanScroll(el.scrollWidth > el.clientWidth + 4);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);

    const interval = setInterval(() => {
      if (isPaused.current || !canScroll) return;
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 2) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        el.scrollBy({ left: speed, behavior: "auto" });
      }
    }, 30);

    const pause = () => { isPaused.current = true; };
    const resume = () => { setTimeout(() => { isPaused.current = false; }, 3000); };

    el.addEventListener("touchstart", pause, { passive: true });
    el.addEventListener("touchend", resume, { passive: true });
    el.addEventListener("mouseenter", pause);
    el.addEventListener("mouseleave", () => { isPaused.current = false; });

    return () => {
      clearInterval(interval);
      ro.disconnect();
      el.removeEventListener("touchstart", pause);
      el.removeEventListener("touchend", resume);
      el.removeEventListener("mouseenter", pause);
    };
  }, [speed, canScroll]);

  return (
    <div
      ref={scrollRef}
      className="flex gap-3 overflow-x-auto scrollbar-hide pb-2"
      style={{ scrollbarWidth: "none" }}
    >
      {children}
    </div>
  );
};

export default AutoScrollRow;
