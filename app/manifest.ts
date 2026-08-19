import type { MetadataRoute } from "next";

/**
 * Minimal PWA manifest so guests can "Add to Home Screen".
 * Swap the SVG icon for proper 192/512 PNGs before sending invites —
 * iOS in particular prefers PNG apple-touch-icons.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Madelaine & Philip — Santorini 2027",
    short_name: "M & P 2027",
    description:
      "Save the date — July 24, 2027 in Santorini, Greece.",
    start_url: "/",
    display: "standalone",
    background_color: "#F4F2ED",
    theme_color: "#202B36",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
