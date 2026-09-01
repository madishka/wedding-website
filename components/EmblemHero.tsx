"use client";

import { useEffect, useRef } from "react";
import { createEmblemScene } from "./emblem-scene";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/**
 * The public root's hero mark: the emblem GLB, turning on its Y axis
 * as the page scrolls through `.emblem-scroll-space` (see page.tsx) —
 * 0° at the top of that space, 180° once it's fully scrolled past, and
 * pinned at 180° for any scroll beyond that. Transparent canvas, so
 * `.hero-bg-plain` (see globals.css) shows through behind it exactly
 * as it does behind the text it replaces.
 *
 * The scene itself lives in emblem-scene.ts, shared with EmblemRsvp.
 */
export function EmblemHero() {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const emblem = createEmblemScene(wrap);
    window.addEventListener("resize", emblem.resize);

    const scrollSpace = document.querySelector<HTMLElement>(
      ".emblem-scroll-space"
    );
    const footerOverlay = document.querySelector<HTMLElement>(
      ".hero-footer-overlay"
    );
    const scrollCue = document.querySelector<HTMLElement>(".scroll-cue");

    function scrollProgress() {
      if (!scrollSpace) return 0;
      // The hero is the page's first element (static top offset 0), so
      // it's pinned from scrollY 0 onward — not from whenever the
      // scroll-space's own top happens to cross the viewport's top
      // edge, which only happens after an extra full viewport of
      // scrolling. The pin lasts exactly the scroll-space's height.
      const total = scrollSpace.offsetHeight || 1;
      return clamp(window.scrollY, 0, total) / total;
    }

    let raf = 0;
    function tick() {
      const progress = scrollProgress();
      emblem.setRotation(progress * Math.PI); // 0 -> 180°, then holds

      // Monogram overlay: starts fading in once the emblem is halfway
      // turned (90°) and is fully in by the time it finishes (180°).
      if (footerOverlay) {
        footerOverlay.style.opacity = String(clamp(progress - 0.5, 0, 0.5) / 0.5);
      }

      // Scroll cue: gone within the first sliver of scrolling, well
      // before the footer overlay above needs the same spot.
      if (scrollCue) {
        scrollCue.style.opacity = String(1 - clamp(progress / 0.08, 0, 1));
      }

      emblem.render();
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", emblem.resize);
      emblem.dispose();
    };
  }, []);

  return <div className="emblem-hero-canvas" ref={wrapRef} aria-hidden="true" />;
}
