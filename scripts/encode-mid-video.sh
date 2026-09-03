#!/bin/bash
# The mid-page backdrop clip (behind "A long weekend" + "Getting to
# Santorini" — see components/SectionVideo.tsx), produced from the Oia
# blue-hour source (santoriniW3):
#
#   bash scripts/encode-mid-video.sh path/to/santoriniW3.mp4
#
# Unlike the hero pipeline this CUTS the source at 2.0 seconds: the
# camera accelerates hard after that, past what motion interpolation
# can fake cleanly (it smears). What's kept — a near-static opening
# ramping into the start of the sweep — is 2x interpolated to 60 fps
# for the hero's frames-per-scrolled-pixel density. The remaining
# in-segment speed ramp is NOT fixed here; it's evened out at scrub
# time by the pacing curve in SectionVideo.tsx (OIA_SEGMENT_CURVE,
# built from the footage's measured per-frame motion). If the cut or
# the source changes, that curve must be regenerated to match.
set -euo pipefail

SRC="${1:?usage: encode-mid-video.sh <source.mp4>}"
FFMPEG="${FFMPEG:-ffmpeg}"
OUT_DIR="$(cd "$(dirname "$0")/.." && pwd)/public"

CUT=2.002
INTERP="minterpolate=fps=59.94:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1"

echo "→ H.264 (universal)"
"$FFMPEG" -v error -y -t "$CUT" -i "$SRC" -an \
  -vf "$INTERP" \
  -c:v libx264 -preset veryslow -crf 22 \
  -g 6 -keyint_min 6 -bf 0 -sc_threshold 0 \
  -pix_fmt yuv420p -movflags +faststart \
  "$OUT_DIR/mid-oia.mp4"

echo "→ HEVC (Safari / iOS / macOS Chrome)"
"$FFMPEG" -v error -y -t "$CUT" -i "$SRC" -an \
  -vf "$INTERP" \
  -c:v libx265 -preset slow -crf 25 \
  -x265-params keyint=6:min-keyint=6:bframes=0:scenecut=0:log-level=error \
  -tag:v hvc1 -pix_fmt yuv420p -movflags +faststart \
  "$OUT_DIR/mid-oia-hevc.mp4"

echo "→ AV1 (browsers without HEVC: Firefox, most Windows/Android Chrome)"
"$FFMPEG" -v error -y -t "$CUT" -i "$SRC" -an \
  -vf "$INTERP" \
  -c:v libaom-av1 -crf 32 -b:v 0 -cpu-used 5 \
  -g 6 -keyint_min 6 -pix_fmt yuv420p -movflags +faststart \
  "$OUT_DIR/mid-oia-av1.mp4"

echo "→ poster (first frame)"
"$FFMPEG" -v error -y -i "$SRC" \
  -frames:v 1 -q:v 3 \
  "$OUT_DIR/mid-oia-poster.jpg"

ls -la "$OUT_DIR"/mid-oia* | awk '{printf "  %6.2f MB  %s\n", $5/1048576, $9}'
