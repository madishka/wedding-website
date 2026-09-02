import { useEffect, type RefObject } from "react";

/**
 * If a browser never fires `seeked` (it happens — seeking to the frame
 * that's already displayed, or a decoder hiccup), stop waiting for it
 * after this long so the scrub can't wedge.
 */
const SEEK_TIMEOUT_MS = 300;

/**
 * How fast the playhead chases the scroll position, per animation
 * frame. Lower = floatier. The default 0.16 settles a full-clip jump
 * in ~half a second, so a flick of the wheel reads as a smooth push
 * rather than a cut, but tracking never feels laggy. Fast-moving
 * footage benefits from a lower value — the extra smoothing hides
 * frame stepping.
 */
const DEFAULT_EASE = 0.16;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/**
 * The scroll-scrub machinery, shared by every scrubbed video on the
 * site (HeroVideo, SectionVideo). The clip is never *played*: scroll
 * position maps to a playhead time and the video is seeked there.
 *
 * Three things make it feel smooth instead of steppy:
 *
 *   1. The playhead eases towards the scroll-derived target each frame
 *      (a lerp), rather than jumping to it. Scroll events arrive in
 *      bursts; this turns them into continuous motion.
 *   2. Seeks are serialised. A new `currentTime` is only set once the
 *      previous `seeked` has fired — piling up seeks is the classic
 *      cause of stutter, since the decoder abandons and restarts work.
 *   3. Targets are quantised to whole frames, and a seek to the frame
 *      already shown is skipped entirely.
 *
 * The clips are encoded for this (short GOPs, no audio) — see
 * scripts/encode-*-video.sh for the reasoning.
 *
 * Under `prefers-reduced-motion` nothing attaches: the video just
 * shows its poster.
 */
export function useVideoScrub(
  videoRef: RefObject<HTMLVideoElement | null>,
  {
    frameDuration,
    targetProgress,
    onProgress,
    ease = DEFAULT_EASE,
  }: {
    /** Seconds per frame of the encoded clip (see the encode script). */
    frameDuration: number;
    /** Scroll position → 0..1, whatever "through my range" means here. */
    targetProgress: () => number;
    /** Fires with the *eased* 0..1 progress whenever it changes. */
    onProgress?: (progress: number, video: HTMLVideoElement) => void;
    /** Per-frame lerp factor towards the target; see DEFAULT_EASE. */
    ease?: number;
  },
  deps: readonly unknown[] = []
) {
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // React doesn't reliably serialise `muted` into the SSR markup, and
    // only a muted video may autoplay without a gesture. Set it before
    // the play() below or the kickstart is refused on mobile.
    video.muted = true;

    let duration = 0;
    let target = 0;
    let current = 0;
    let raf = 0;
    let seekBusy = false;
    let pending = -1;
    let lastSeeked = -1;
    let seekTimer = 0;

    const maxTime = () => Math.max(duration - frameDuration, 0);
    const targetTime = () =>
      clamp(targetProgress(), 0, 1) * maxTime();

    const publish = () => {
      if (!onProgress) return;
      const max = Math.max(maxTime(), Number.EPSILON);
      onProgress(clamp(current / max, 0, 1), video);
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
      const quantised = Math.round(time / frameDuration) * frameDuration;
      if (Math.abs(quantised - lastSeeked) < frameDuration / 2) return;
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
      current += (target - current) * ease;
      if (Math.abs(target - current) < frameDuration / 4) current = target;
      seek(current);
      publish();
      if (current !== target) raf = requestAnimationFrame(tick);
    };

    const onScroll = () => {
      if (!duration) return;
      target = targetTime();
      if (!raf) raf = requestAnimationFrame(tick);
    };

    // Chrome won't paint a frame from a manual seek until the video has
    // played at least once (Safari doesn't mind). A muted play-then-pause
    // unlocks the decoder without anything visibly playing — then put
    // the playhead back where the initial seek left it, since the brief
    // play advances it a frame or two.
    const kickstart = () => {
      const settle = () => {
        video.pause();
        lastSeeked = -1;
        seek(current);
      };
      const p = video.play();
      if (p) p.then(settle).catch(() => {});
      else settle();
    };

    const onReady = () => {
      if (!Number.isFinite(video.duration) || video.duration <= 0) return;
      duration = video.duration;
      kickstart();
      // Land on the right frame immediately if the page was loaded
      // mid-scroll, instead of easing in from frame 0.
      current = target = targetTime();
      seek(current);
      publish();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
