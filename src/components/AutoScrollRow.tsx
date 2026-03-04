import { useRef, useEffect, useState, Children, cloneElement, isValidElement } from "react";

interface Props {
  children: React.ReactNode;
  speed?: number;
}

const AutoScrollRow = ({ children, speed = 1 }: Props) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isPaused = useRef(false);
  const canScrollRef = useRef(false);
  const [duplicates, setDuplicates] = useState(1);

  // Calculate how many times to duplicate children so they overflow
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const calcDuplicates = () => {
      const childArray = Children.toArray(children);
      if (childArray.length === 0) return;

      // Measure single set width vs container
      const containerWidth = el.clientWidth;
      const singleSetWidth = el.scrollWidth / duplicates;

      if (singleSetWidth <= containerWidth && singleSetWidth > 0) {
        // Need enough copies to overflow by at least 1.5x
        const needed = Math.ceil((containerWidth * 1.5) / singleSetWidth) + 1;
        if (needed > duplicates) {
          setDuplicates(needed);
        }
      }
    };

    // Run after render
    const timer = setTimeout(calcDuplicates, 100);
    const ro = new ResizeObserver(calcDuplicates);
    ro.observe(el);

    return () => {
      clearTimeout(timer);
      ro.disconnect();
    };
  }, [children, duplicates]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const check = () => { canScrollRef.current = el.scrollWidth > el.clientWidth + 4; };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);

    const interval = setInterval(() => {
      if (isPaused.current || !canScrollRef.current) return;
      // Seamless loop: when we've scrolled past the first copy, jump back
      const singleSetWidth = el.scrollWidth / duplicates;
      if (singleSetWidth > 0 && el.scrollLeft >= singleSetWidth) {
        el.scrollLeft -= singleSetWidth;
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
  }, [speed, duplicates]);

  const childArray = Children.toArray(children);

  return (
    <div
      ref={scrollRef}
      className="flex gap-3 overflow-x-auto scrollbar-hide pb-2"
      style={{ scrollbarWidth: "none" }}
    >
      {Array.from({ length: duplicates }).map((_, i) =>
        childArray.map((child, j) =>
          isValidElement(child)
            ? cloneElement(child, { key: `${i}-${j}` } as any)
            : child
        )
      )}
    </div>
  );
};

export default AutoScrollRow;
