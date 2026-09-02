"use client";

import { useEffect } from "react";

/**
 * Scroll-linked parallax for the pinned hero (the hero itself is
 * `position: sticky` — see .hero in globals.css — so content slides
 * over it like a curtain). While the first viewport scrolls by:
 *   - the hero text drifts up at ~0.28x and fades
 *   - the backdrop slowly zooms and sinks
 * Transform/opacity only (compositor-friendly), rAF-throttled, and
 * disabled entirely for prefers-reduced-motion.
 *
 * `fadeContent` gates the text drift/fade only. The public root's
 * emblem (EmblemHero, also inside `.hero-inner`) has its own
 * scroll-driven rotation and must stay centered and fully opaque for
 * the whole scroll runway, so Hero.tsx passes `fadeContent={false}`
 * there — the backdrop zoom still applies in both modes.
 *
 * When the hero has a scroll runway (`.hero-scroll-space`, rendered in
 * video mode — see Hero.tsx), everything is stretched over the runway
 * plus the curtain that follows — the whole time any of the hero is on
 * screen. The text drifts the same total distance, just more slowly, and
 * finishes fading exactly as the content covers it, same as it does
 * without a runway. (Fading it out over the first viewport and then
 * holding it half-visible for the rest of the runway read as a stall.)
 */
export function HeroMotion({ fadeContent = true }: { fadeContent?: boolean }) {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const inner = document.querySelector<HTMLElement>(".hero-inner");
    const bg = document.querySelector<HTMLElement>(".hero-bg");
    // Either runway: the full version's video spacer, or the public
    // root's emblem spacer (which is that page's entire scroll range).
    const runway = document.querySelector<HTMLElement>(
      ".hero-scroll-space, .emblem-scroll-space"
    );
    if (!inner || !bg) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      const vh = window.innerHeight;
      // 0 → 1 over the hero's visible lifetime: the first viewport when
      // there's no runway; runway + the curtain that follows when there
      // is one and content comes after it (fadeContent doubles as "this
      // is the full version"); just the runway on the public root,
      // where nothing follows.
      const range =
        (runway?.offsetHeight ?? 0) + (fadeContent ? vh : 0) || vh;
      const p = Math.min(window.scrollY, range) / range;
      if (fadeContent) {
        inner.style.transform = `translate3d(0, ${p * vh * -0.28}px, 0)`;
        inner.style.opacity = String(1 - p * 0.85);
      }
      // keep the drift smaller than what the zoom covers, so no edge gap
      bg.style.transform = `translate3d(0, ${p * vh * 0.025}px, 0) scale(${1 + p * 0.06})`;
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
  }, [fadeContent]);

  return null;
}
