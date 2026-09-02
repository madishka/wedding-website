"use client";

import { useEffect, useRef } from "react";
import { createEmblemScene } from "./emblem-scene";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/**
 * The public root's hero mark: the emblem GLB, turning on its Y axis
 * as the page scrolls through `.emblem-scroll-space` (see page.tsx) —
 * 180° at the top of that space, unwinding to 0° once it's fully
 * scrolled past, and pinned at 0° for any scroll beyond that. Transparent canvas, so
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
    const heroVideo = document.querySelector<HTMLVideoElement>(".hero-video");

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

    function progress() {
      // When the hero backdrop is the scrubbed video, turn with *its*
      // eased progress (HeroVideo.tsx publishes it) instead of raw
      // scroll position. The playhead trails the scroll by design, and
      // an emblem driven by scroll directly would finish its turn out
      // of step with the clip. Until the video has published anything
      // (still loading, or reduced motion), scroll drives the turn as
      // it always did.
      const scrub = heroVideo?.dataset.scrubProgress;
      if (scrub !== undefined) {
        const p = Number(scrub);
        if (Number.isFinite(p)) return clamp(p, 0, 1);
      }
      return scrollProgress();
    }

    let raf = 0;
    function tick() {
      const p = progress();
      emblem.setRotation((1 - p) * Math.PI); // 180° -> 0°: what used to be
      // the end pose is now the resting one, unwinding as you scroll
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
