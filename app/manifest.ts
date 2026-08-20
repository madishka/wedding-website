import type { MetadataRoute } from "next";

/**
 * Minimal PWA manifest so guests can "Add to Home Screen".
 * Swap the SVG icon for proper 192/512 PNGs before sending invites —
 * iOS in particular prefers PNG apple-touch-icons.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Madelaine & Philip",
    short_name: "M & P",
    // No date or location: the manifest is served on the public root.
    description: "Madelaine and Philip are getting married.",
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
