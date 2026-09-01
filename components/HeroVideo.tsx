"use client";

import { useEffect, useRef } from "react";

/**
 * Seconds per frame of the encoded clip. The encode script interpolates
 * the source to 59.94 fps (see scripts/encode-hero-video.sh); if that
 * ever changes, change this too, or seeks will land between frames.
 */
const FRAME = 1 / 59.94;

/**
 * How fast the playhead chases the scroll position, per animation
 * frame. Lower = floatier. 0.16 settles a full-clip jump in ~half a
 * second, so a flick of the wheel reads as a smooth push rather than
 * a cut, but tracking never feels laggy.
 */
const EASE = 0.16;

/**
 * If a browser never fires `seeked` (it happens — seeking to the frame
 * that's already displayed, or a decoder hiccup), stop waiting for it
 * after this long so the scrub can't wedge.
 */
const SEEK_TIMEOUT_MS = 300;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Scroll-scrubbed video backdrop for the hero.
 *
 * The clip is never *played*. Scroll position maps to a playhead time,
 * and the video is seeked there — so scrolling down pushes the drone
 * forward over the caldera, and scrolling back up pulls it back. The
 * scrub range is `.hero-scroll-space` (the spacer Hero.tsx renders after
 * the pinned hero) plus the viewport the content sections take to
 * curtain over it — the clip keeps moving for as long as any of the
 * hero is on screen, and so do the names (HeroMotion.tsx), so nothing
 * ever sits frozen waiting for the next section.
 *
 * Three things make this feel smooth instead of steppy:
 *
 *   1. The playhead eases towards the scroll-derived target each frame
 *      (a lerp), rather than jumping to it. Scroll events arrive in
 *      bursts; this turns them into continuous motion.
 *   2. Seeks are serialised. A new `currentTime` is only set once the
 *      previous `seeked` has fired — piling up seeks is the classic cause
 *      of stutter, since the decoder abandons and restarts work.
 *   3. Targets are quantised to whole frames, and a seek to the frame
 *      already shown is skipped entirely.
 *
 * The clip itself is encoded for this (short GOPs, 60 fps, no audio) —
 * see scripts/encode-hero-video.sh for the reasoning.
 *
 * `prefers-reduced-motion` gets the poster frame and nothing else.
 */
export function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // React doesn't reliably serialise `muted` into the SSR markup, and
    // only a muted video may autoplay without a gesture. Set it before
    // the play() below or the kickstart is refused on mobile.
    video.muted = true;

    const runway = document.querySelector<HTMLElement>(".hero-scroll-space");

    let duration = 0;
    let target = 0;
    let current = 0;
    let raf = 0;
    let seekBusy = false;
    let pending = -1;
    let lastSeeked = -1;
    let seekTimer = 0;

    const targetTime = () => {
      // Same range as HeroMotion.tsx: runway plus the viewport the
      // content takes to slide over the hero, so the clip is still
      // moving right up until it's covered.
      const range = window.innerHeight + (runway?.offsetHeight ?? 0);
      const progress = clamp(window.scrollY / range, 0, 1);
      // Stop one frame short of the end so we never trip `ended`.
      return progress * Math.max(duration - FRAME, 0);
    };

    const onSeeked = () => {
      window.clearTimeout(seekTimer);
      seekBusy = false;
      if (pending >= 0) {
        const next = pending;
        pending = -1;
        seek(next);
      }
    };

    const seek = (time: number) => {
      const quantised = Math.round(time / FRAME) * FRAME;
      if (Math.abs(quantised - lastSeeked) < FRAME / 2) return;
      if (seekBusy) {
        pending = quantised;
        return;
      }
      seekBusy = true;
      lastSeeked = quantised;
      video.currentTime = quantised;
      window.clearTimeout(seekTimer);
      seekTimer = window.setTimeout(onSeeked, SEEK_TIMEOUT_MS);
    };

    const tick = () => {
      raf = 0;
      current += (target - current) * EASE;
      if (Math.abs(target - current) < FRAME / 4) current = target;
      seek(current);
      if (current !== target) raf = requestAnimationFrame(tick);
    };

    const onScroll = () => {
      if (!duration) return;
      target = targetTime();
      if (!raf) raf = requestAnimationFrame(tick);
    };

    // Chrome won't paint a frame from a manual seek until the video has
    // played at least once (Safari doesn't mind). A muted play-then-pause
    // unlocks the decoder without anything visibly playing.
    const kickstart = () => {
      const p = video.play();
      if (p) p.then(() => video.pause()).catch(() => {});
      else video.pause();
    };

    const onReady = () => {
      if (!Number.isFinite(video.duration) || video.duration <= 0) return;
      duration = video.duration;
      kickstart();
      // Land on the right frame immediately if the page was reloaded
      // mid-scroll, instead of easing in from frame 0.
      current = target = targetTime();
      seek(current);
    };

    video.addEventListener("seeked", onSeeked);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    // Metadata may already be in by the time this effect runs — the
    // element started loading as soon as the server markup arrived.
    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) onReady();
    else video.addEventListener("loadedmetadata", onReady, { once: true });

    return () => {
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("loadedmetadata", onReady);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.clearTimeout(seekTimer);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

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
