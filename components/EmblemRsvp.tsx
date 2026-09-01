"use client";

import { useEffect, useRef } from "react";
import { createEmblemScene } from "./emblem-scene";

/** Share of the turn over which the emblem fades in from nothing. */
const FADE_PORTION = 0.35;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/**
 * The emblem again, smaller, above "Kindly reply by" in the RSVP
 * section — the same 0° → 180° turn as the public root's hero, driven
 * by how far the RSVP section has scrolled into view:
 *
 *   0    the section's top edge enters at the bottom of the viewport
 *   1    its bottom edge has come up to the bottom of the viewport,
 *        i.e. the reader has reached the bottom of the section
 *
 * It fades in over the first part of that turn instead of being there
 * from the start (there is no dark hero to hide it in here — it would
 * just be sitting on white). Both stop at 1 and hold, so scrolling on
 * to the footer changes nothing.
 *
 * Renders only when scroll or resize actually changes something, not
 * on a permanent rAF loop like the hero: this one sits on a page with
 * a form and a scrubbed video, so it shouldn't idle on the GPU.
 */
export function EmblemRsvp() {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const section = wrap.closest<HTMLElement>(".rsvp") ?? wrap;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const emblem = createEmblemScene(wrap);

    let raf = 0;
    const update = () => {
      raf = 0;
      if (reduceMotion) {
        emblem.setRotation(0);
        wrap.style.opacity = "1";
      } else {
        const rect = section.getBoundingClientRect();
        const p = clamp((window.innerHeight - rect.top) / rect.height, 0, 1);
        emblem.setRotation(p * Math.PI);
        wrap.style.opacity = String(clamp(p / FADE_PORTION, 0, 1));
      }
      emblem.render();
    };
    const request = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    const onResize = () => {
      emblem.resize();
      request();
    };

    emblem.onLoad(request);
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", onResize);
    request();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", request);
      window.removeEventListener("resize", onResize);
      emblem.dispose();
    };
  }, []);

  return <div className="rsvp-emblem" ref={wrapRef} aria-hidden="true" />;
}
