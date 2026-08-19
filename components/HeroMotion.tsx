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
 */
export function HeroMotion() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const inner = document.querySelector<HTMLElement>(".hero-inner");
    const bg = document.querySelector<HTMLElement>(".hero-bg");
    if (!inner || !bg) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      const vh = window.innerHeight;
      const y = Math.min(window.scrollY, vh);
      const p = y / vh; // 0 → 1 across the first viewport
      inner.style.transform = `translate3d(0, ${y * -0.28}px, 0)`;
      inner.style.opacity = String(1 - p * 0.85);
      // keep the drift smaller than what the zoom covers, so no edge gap
      bg.style.transform = `translate3d(0, ${y * 0.025}px, 0) scale(${1 + p * 0.06})`;
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
  }, []);

  return null;
}
