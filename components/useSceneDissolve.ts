import { useEffect, type RefObject } from "react";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/**
 * The scene entrance cross-dissolve, shared by every pinned backdrop
 * (SectionVideo, SectionImage): smoothstepped opacity over the
 * wrapper's entry — 0 as its top edge enters at the bottom of the
 * viewport, 1 as it reaches the top.
 *
 * OPACITY ONLY — deliberately no positioning here. The layer is held
 * viewport-pinned through entry AND exit by native position: sticky
 * alone: its container (.mid-backdrop) extends one viewport above and
 * below the wrapper (see globals.css), so the browser's compositor
 * pins it a viewport early and releases it a viewport late — exactly
 * the dissolve windows. An earlier version did that positioning with
 * per-frame JS transforms, and because scroll-driven JS runs a frame
 * behind the compositor, the backdrop visibly jittered up and down
 * against the native sticky during entry/exit — on every platform,
 * worst wherever frames are slowest. A one-frame-late *fade* is
 * imperceptible; a one-frame-late *position* never is.
 *
 * Scroll-linked directly (no easing): it must track the finger
 * exactly. Inert under reduced motion.
 */
export function useSceneDissolve(
  stickyRef: RefObject<HTMLElement | null>,
  wrapperSelector: string
) {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const sticky = stickyRef.current;
    const wrap = sticky?.closest<HTMLElement>(wrapperSelector);
    if (!sticky || !wrap) return;

    let raf = 0;
    let lastT = -1;
    const update = () => {
      raf = 0;
      const rect = wrap.getBoundingClientRect();
      const vh = window.innerHeight;
      const e = clamp(1 - rect.top / vh, 0, 1);
      const t = e * e * (3 - 2 * e); // smoothstep
      if (t === lastT) return;
      lastT = t;
      sticky.style.opacity = String(t);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [stickyRef, wrapperSelector]);
}
