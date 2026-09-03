#!/bin/bash
# Turns a source clip into the scroll-scrubbed hero video (see
# components/HeroVideo.tsx) and its poster frame.
#
#   bash scripts/encode-hero-video.sh path/to/source.mp4
#
# Needs ffmpeg on the PATH (or set FFMPEG=/path/to/ffmpeg). `npx
# ffmpeg-static` works if you don't want to install it globally:
#   FFMPEG="$(node -p "require('ffmpeg-static')")" bash scripts/encode-hero-video.sh ...
#
# Why the encode looks the way it does — every choice here is about
# seeking, because the hero is never *played*; the scroll position sets
# `currentTime` many times a second:
#
#   * 2x motion interpolation (30 -> 60 fps). The drone move is very slow,
#     so the interpolated in-betweens are near-perfect, and doubling the
#     frame count halves how far the page scrolls per frame step.
#   * keyint 6, no B-frames. Every seek decodes at most 5 extra frames,
#     which is nothing at 1080p, and P-frames on slow footage are tiny —
#     ~40% the size of all-intra for the same quality. (Long GOPs would
#     make each seek decode up to a few seconds of video.)
#   * No audio track. It's muted and scrubbed; the AAC was dead weight.
#   * faststart so the moov atom is at the front and seeking can begin
#     before the file has fully downloaded.
#
# Two outputs: HEVC for Apple devices (about 30% smaller at the same
# quality; also decodes in hardware on every iPhone) and H.264 for
# everything else. <video> picks the first <source> it can play.
set -euo pipefail

SRC="${1:?usage: encode-hero-video.sh <source.mp4>}"
FFMPEG="${FFMPEG:-ffmpeg}"
OUT_DIR="$(cd "$(dirname "$0")/.." && pwd)/public"

INTERP="minterpolate=fps=59.94:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1"

echo "→ H.264 (universal)"
"$FFMPEG" -v error -y -i "$SRC" -an \
  -vf "$INTERP" \
  -c:v libx264 -preset veryslow -crf 22 \
  -g 6 -keyint_min 6 -bf 0 -sc_threshold 0 \
  -pix_fmt yuv420p -movflags +faststart \
  "$OUT_DIR/hero-caldera.mp4"

echo "→ HEVC (Safari / iOS / macOS Chrome)"
"$FFMPEG" -v error -y -i "$SRC" -an \
  -vf "$INTERP" \
  -c:v libx265 -preset slow -crf 25 \
  -x265-params keyint=6:min-keyint=6:bframes=0:scenecut=0:log-level=error \
  -tag:v hvc1 -pix_fmt yuv420p -movflags +faststart \
  "$OUT_DIR/hero-caldera-hevc.mp4"

echo "→ AV1 (browsers without HEVC: Firefox, most Windows/Android Chrome)"
"$FFMPEG" -v error -y -i "$SRC" -an \
  -vf "$INTERP" \
  -c:v libaom-av1 -crf 32 -b:v 0 -cpu-used 5 \
  -g 6 -keyint_min 6 -pix_fmt yuv420p -movflags +faststart \
  "$OUT_DIR/hero-caldera-av1.mp4"

echo "→ poster (first frame)"
"$FFMPEG" -v error -y -i "$SRC" \
  -frames:v 1 -q:v 3 \
  "$OUT_DIR/hero-caldera-poster.jpg"

ls -la "$OUT_DIR"/hero-caldera* | awk '{printf "  %6.2f MB  %s\n", $5/1048576, $9}'
