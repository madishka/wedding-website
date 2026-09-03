"use client";

import { useCallback, useRef } from "react";
import { useVideoScrub } from "./useVideoScrub";

/**
 * Seconds per frame of the encoded clip. The encode script interpolates
 * the source to 59.94 fps (see scripts/encode-hero-video.sh); if that
 * ever changes, change this too, or seeks will land between frames.
 */
const FRAME = 1 / 59.94;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Scroll-scrubbed video backdrop for the hero: scrolling down pushes
 * the drone forward over the caldera, scrolling back up pulls it back.
 * The scrub range is the runway spacer plus (with `curtain`) the
 * viewport the content takes to slide over the hero, so the clip keeps
 * moving until it's covered. The machinery lives in useVideoScrub.ts,
 * shared with SectionVideo.
 *
 * The eased 0→1 progress is published on the element as
 * `data-scrub-progress` for anything that must move in lockstep with
 * the picture — the public root's emblem turns from it rather than
 * from raw scroll, so the two can never drift apart while the playhead
 * is still chasing the scroll (see EmblemHero.tsx).
 */
export function HeroVideo({
  runwaySelector = ".hero-scroll-space",
  curtain = true,
}: {
  /** The spacer whose height is the scroll runway. */
  runwaySelector?: string;
  /**
   * Whether content slides over the hero after the runway. If so the
   * scrub range also includes that extra viewport of scrolling, so the
   * clip keeps moving until the hero is covered. The public root has
   * nothing after its runway, so there the runway is the whole range.
   */
  curtain?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const targetProgress = useCallback(() => {
    const runway = document.querySelector<HTMLElement>(runwaySelector);
    const range =
      (runway?.offsetHeight ?? 0) + (curtain ? window.innerHeight : 0) ||
      window.innerHeight;
    // Both terms are zero in a zero-height viewport — a hidden pane, a
    // collapsed iframe, some link-preview crawlers — and then the `||`
    // fallback is zero too, making this 0/0 = NaN.
    if (!(range > 0)) return 0;
    return clamp(window.scrollY / range, 0, 1);
  }, [runwaySelector, curtain]);

  useVideoScrub(
    videoRef,
    {
      frameDuration: FRAME,
      targetProgress,
      onProgress: (progress, video) => {
        video.dataset.scrubProgress = String(progress);
      },
    },
    [targetProgress]
  );

  return (
    <div className="hero-bg hero-bg-video" aria-hidden="true">
      <video
        ref={videoRef}
        className="hero-video"
        muted
        playsInline
        preload="auto"
        poster="/hero-caldera-poster.jpg"
        disablePictureInPicture
        disableRemotePlayback
        tabIndex={-1}
      >
        {/* HEVC first: ~30% smaller, hardware-decoded on every Apple
            device and on macOS Chrome. Browsers that can't play it
            (Chrome on Windows/Android without the codec) skip to the
            H.264 source. The codec string has to be exact for that
            check to be honest — it's read from the encoded file, see
            the encode script. */}
        <source
          src="/hero-caldera-hevc.mp4"
          type='video/mp4; codecs="hvc1.1.6.L123.B0"'
        />
        <source src="/hero-caldera.mp4" type="video/mp4" />
      </video>
      {/* Same darkening gradients the photo backdrop bakes into its
          background-image, as a layer over the video instead. */}
      <div className="hero-video-scrim" />
    </div>
  );
}
