/**
 * Smoothly scrolls to an element and keeps correcting the target position while
 * the page is still settling (images loading, sections mounting). Without this,
 * a native smooth scroll locks onto a position computed before layout shifts and
 * ends up stopping somewhere in the middle of the page.
 */
export function smoothScrollToElement(
  el: HTMLElement,
  options: { offset?: number; behavior?: ScrollBehavior; duration?: number } = {}
) {
  if (typeof window === "undefined") return;

  const { offset = 16, behavior = "smooth", duration = 1400 } = options;

  let cancelled = false;
  const cancel = () => {
    cancelled = true;
    cleanup();
  };
  const cleanup = () => {
    window.removeEventListener("wheel", cancel);
    window.removeEventListener("touchstart", cancel);
    window.removeEventListener("keydown", cancel);
  };

  // Only a real user gesture aborts the animation.
  window.addEventListener("wheel", cancel, { passive: true });
  window.addEventListener("touchstart", cancel, { passive: true });
  window.addEventListener("keydown", cancel);

  const targetTop = () =>
    Math.max(0, window.scrollY + el.getBoundingClientRect().top - offset);

  const maxScroll = () =>
    Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

  const start = performance.now();
  let lastRequested = -1;

  const tick = () => {
    if (cancelled) return;

    const desired = Math.min(targetTop(), maxScroll());
    const delta = Math.abs(desired - window.scrollY);

    // Re-issue the scroll only when the goal actually moved (layout shift) to
    // avoid fighting the browser's own smooth-scroll animation.
    if (Math.abs(desired - lastRequested) > 2) {
      lastRequested = desired;
      window.scrollTo({ top: desired, behavior });
    }

    const elapsed = performance.now() - start;
    if (delta > 2 && elapsed < duration) {
      requestAnimationFrame(tick);
      return;
    }

    cleanup();
  };

  requestAnimationFrame(() => requestAnimationFrame(tick));
}
