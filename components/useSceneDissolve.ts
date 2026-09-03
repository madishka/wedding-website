import { useEffect, type RefObject } from "react";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/**
 * The scene entrance/exit cross-dissolve, shared by every pinned
 * backdrop (SectionVideo, SectionImage). During entry the sticky layer
 * is translated up by exactly the wrapper's remaining offset, so the
 * incoming scene covers the FULL viewport from the first pixel — no
 * traveling edge — and only its opacity changes (smoothstepped).
 *
 * Exit-pin only while the wrapper is still on screen. For a scene
 * followed by another, that IS the dissolve window; beyond it an
 * unbounded offset would park the layer over the whole rest of the
 * page. For the LAST scene the wrapper never fully exits — only the
 * footer's height scrolls past — so the pin holds the picture fixed
 * while the footer rides up over it. The offset is additionally capped
 * at the wrapper's document-space distance to the page end, so
 * Safari's elastic overscroll can't drag the scene out below the
 * footer while the bounce chases the viewport.
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
    const update = () => {
      raf = 0;
      const rect = wrap.getBoundingClientRect();
      const vh = window.innerHeight;
      const e = clamp(1 - rect.top / vh, 0, 1);
      const t = e * e * (3 - 2 * e); // smoothstep
      sticky.style.opacity = String(t);
      const entryOffset = -Math.max(rect.top, 0);
      const afterWrapper = Math.max(
        document.documentElement.scrollHeight - (rect.bottom + window.scrollY),
        0
      );
      const exitOffset =
        rect.bottom > 0
          ? Math.min(Math.max(vh - rect.bottom, 0), afterWrapper)
          : 0;
      sticky.style.transform = `translate3d(0, ${entryOffset + exitOffset}px, 0)`;
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
