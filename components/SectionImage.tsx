"use client";

import { useEffect, useRef } from "react";
import { useSceneDissolve } from "./useSceneDissolve";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/**
 * A pinned STILL backdrop with the same entrance/exit cross-dissolve
 * as the video scenes (useSceneDissolve) — currently the finale, with
 * the moody aerial sea behind the reply card. Shares the .mid-backdrop
 * structure and scrim with SectionVideo.
 *
 * The Ken Burns move is SCROLL-driven, like every other motion on the
 * page: zoom-in plus a diagonal drift mapped over the wrapper's whole
 * visible life, so it answers to the finger and holds still while the
 * form is being filled. Inert under reduced motion.
 */
export function SectionImage({
  src,
  wrapperSelector = ".mid",
}: {
  /**
   * Image URL for an inline background. Omit it and CSS supplies the
   * picture instead — which is how the finale gets format negotiation
   * (`.fin .mid-image` uses image-set for AVIF with a JPEG fallback,
   * something an inline style can't express).
   */
  src?: string;
  /** The wrapper whose visible life is the dissolve range (.mid, .fin). */
  wrapperSelector?: string;
}) {
  const stickyRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  useSceneDissolve(stickyRef, wrapperSelector);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const image = imageRef.current;
    const wrap = image?.closest<HTMLElement>(wrapperSelector);
    if (!image || !wrap) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = wrap.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = clamp((vh - rect.top) / (vh + rect.height), 0, 1);
      // Zoom 1.04 → 1.14 with a diagonal drift. The minimum scale
      // always exceeds the pan distance, so no edge can show (and the
      // sticky layer clips whatever overflows anyway).
      const scale = 1.04 + 0.1 * p;
      const dx = 0.7 - 1.4 * p; // percent
      const dy = 0.5 - 1.0 * p;
      image.style.transform = `translate3d(${dx}%, ${dy}%, 0) scale(${scale})`;
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
  }, [wrapperSelector]);

  return (
    <div className="mid-backdrop" aria-hidden="true">
      <div className="mid-backdrop-sticky" ref={stickyRef}>
        <div
          className="mid-image"
          ref={imageRef}
          style={src ? { backgroundImage: `url(${src})` } : undefined}
        />
        <div className="mid-video-scrim" />
      </div>
    </div>
  );
}
