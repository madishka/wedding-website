"use client";

import { useCallback, useEffect, useRef } from "react";
import { useVideoScrub } from "./useVideoScrub";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export type MidVideoConfig = {
  hevcSrc: string;
  /** Exact codec string read from the encoded file (see encode script). */
  hevcType: string;
  h264Src: string;
  poster: string;
  /** Seconds per frame of the encoded clip. */
  frameDuration: number;
  /**
   * Optional scroll→time remap: samples of time-progress at evenly
   * spaced scroll-progress, [0 … 1] at both ends, linearly
   * interpolated between samples. Built from the clip's per-frame
   * motion profile so footage that speeds up on screen gets *more*
   * scroll for the same seconds — apparent motion per scrolled pixel
   * stays constant. Omit for a linear mapping.
   */
  curve?: number[];
  /**
   * How much of the curve to apply, 0..1 (default 1). Full flattening
   * makes the pacing uniform *everywhere*, which can read as frozen
   * when only a sliver of the video is on screen — blending some of
   * the linear mapping back in lets the footage's naturally faster
   * stretches show a bit of their own life again.
   */
  curveMix?: number;
  /** Lerp smoothing override — lower is floatier (useVideoScrub.ts). */
  ease?: number;
};

/**
 * The pacing curve for the shipped clip: samples of time-progress at
 * evenly spaced scroll-progress, built from the footage's measured
 * per-frame motion so apparent movement per scrolled pixel stays even.
 * The source's camera accelerates hard through the segment — this
 * races through the near-static opening and stretches the sweep.
 */
const OIA_SEGMENT_CURVE = [
  0.0, 0.0701, 0.1623, 0.2585, 0.3518, 0.4433, 0.5125, 0.564, 0.6099,
  0.6507, 0.6833, 0.7142, 0.7429, 0.7699, 0.795, 0.8172, 0.8392, 0.8612,
  0.8822, 0.9032, 0.9234, 0.9436, 0.9632, 0.982, 1.0,
];

/**
 * The shipped clip: the Oia blue-hour glide (santoriniW3), cut at 2.0s
 * — right before its camera acceleration gets too fast to interpolate
 * — and 2x motion-interpolated to 60 fps (116 frames, the hero's
 * frames-per-scrolled-pixel density). See scripts/encode-mid-video.sh.
 * curveMix 0.7 spends the motion budget where attention is: it skips
 * the static opening quickly but keeps some punch for the exit, which
 * at full flattening read as frozen.
 */
const DEFAULT_CONFIG: MidVideoConfig = {
  hevcSrc: "/mid-oia-hevc.mp4",
  hevcType: 'video/mp4; codecs="hvc1.1.6.L123.B0"',
  h264Src: "/mid-oia.mp4",
  poster: "/mid-oia-poster.jpg",
  frameDuration: 1 / 59.94,
  curve: OIA_SEGMENT_CURVE,
  curveMix: 0.7,
  ease: 0.12,
};

/**
 * The finale backdrop, behind the RSVP reply card: the Imerovigli
 * terraces in daylight (santoriniW2), first 2s, 2x interpolated to
 * 60 fps. Its motion is uniform (measured), so no curve — just an
 * extra-floaty ease so the glide stays barely noticeable behind the
 * form.
 */
export const FIN_VIDEO_CONFIG: MidVideoConfig = {
  hevcSrc: "/fin-terrace-hevc.mp4",
  hevcType: 'video/mp4; codecs="hvc1.1.6.L123.B0"',
  h264Src: "/fin-terrace.mp4",
  poster: "/fin-terrace-poster.jpg",
  frameDuration: 1 / 59.94,
  ease: 0.1,
};

/** Piecewise-linear lookup through the curve samples. */
function applyCurve(curve: number[], progress: number) {
  const scaled = clamp(progress, 0, 1) * (curve.length - 1);
  const idx = Math.floor(scaled);
  if (idx >= curve.length - 1) return curve[curve.length - 1];
  const frac = scaled - idx;
  return curve[idx] + (curve[idx + 1] - curve[idx]) * frac;
}

/**
 * A clip pinned behind a wrapper of sections and scrubbed by scroll —
 * same manoeuvre as the hero, one level down.
 *
 * Structure: the wrapper (.mid, .fin) gets an absolutely-positioned
 * backdrop layer holding a sticky, viewport-tall video. The video pins
 * while the sections scroll past, and the scrub progress spans the
 * wrapper's whole visible life: 0 as its top edge enters at the bottom
 * of the viewport, 1 as its bottom edge leaves at the top. The
 * sections themselves go transparent inside the wrapper (see
 * globals.css) with a heavy scrim here for legibility — the footage is
 * light, so it reads as texture behind the dark world, not as a bright
 * window in it.
 *
 * `config` picks the clip and pacing; the default is the tuned result
 * of comparing three candidate clips and pacing treatments.
 */
export function SectionVideo({
  config = DEFAULT_CONFIG,
  wrapperSelector = ".mid",
}: {
  config?: MidVideoConfig;
  /** The wrapper whose visible life is the scrub range (.mid, .fin). */
  wrapperSelector?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const { curve, curveMix = 1, ease, frameDuration } = config;

  // The entrance and exit: a pure cross-dissolve on both ends. During
  // entry the sticky backdrop is translated up by exactly the
  // wrapper's remaining offset, so the incoming scene covers the FULL
  // viewport from the first pixel — there is no traveling edge at all
  // — and only its opacity changes, fading in over the outgoing scene
  // while the content scrolls up through the blend. Smoothstepped so
  // the fade eases in and lands softly at the pin. Scroll-linked
  // directly (no easing): it must track the finger exactly. Inert
  // under reduced motion.
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
      // Entry: hold the layer viewport-aligned before the pin, so the
      // scene fades in covering the whole screen. Exit: hold it pinned
      // while the wrapper's bottom passes (sticky would otherwise slide
      // up with it), so the NEXT scene's dissolve happens over a
      // stationary outgoing picture — the hero gets this for free by
      // being sticky over the whole page; every later scene needs it
      // done by hand. The two offsets are never nonzero at once.
      const entryOffset = -Math.max(rect.top, 0);
      const exitOffset = Math.max(vh - rect.bottom, 0);
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
  }, [wrapperSelector]);

  const targetProgress = useCallback(() => {
    const wrap = videoRef.current?.closest<HTMLElement>(wrapperSelector);
    if (!wrap) return 0;
    const rect = wrap.getBoundingClientRect();
    const vh = window.innerHeight;
    const p = clamp((vh - rect.top) / (vh + rect.height), 0, 1);
    if (!curve) return p;
    const mix = clamp(curveMix, 0, 1);
    return applyCurve(curve, p) * mix + p * (1 - mix);
  }, [curve, curveMix, wrapperSelector]);

  useVideoScrub(
    videoRef,
    { frameDuration, targetProgress, ease },
    [targetProgress, frameDuration, ease]
  );

  return (
    <div className="mid-backdrop" aria-hidden="true">
      <div className="mid-backdrop-sticky" ref={stickyRef}>
        <video
          ref={videoRef}
          muted
          playsInline
          preload="auto"
          poster={config.poster}
          disablePictureInPicture
          disableRemotePlayback
          tabIndex={-1}
        >
          <source src={config.hevcSrc} type={config.hevcType} />
          <source src={config.h264Src} type="video/mp4" />
        </video>
        <div className="mid-video-scrim" />
      </div>
    </div>
  );
}
