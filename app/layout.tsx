import type { Metadata, Viewport } from "next";
// Self-hosted fonts (no request to Google at build or runtime)
import "@fontsource-variable/cormorant-garamond"; // display
import "@fontsource-variable/jost"; // body
import "./globals.css";

/**
 * Deliberately says nothing about when or where.
 *
 * The title is what shows in a browser tab and — more importantly — in
 * the link preview whenever someone pastes the URL into WhatsApp or
 * iMessage. Those previews get forwarded. Details live behind a token.
 */
export const metadata: Metadata = {
  title: "Madelaine & Philip",
  description: "Madelaine and Philip are getting married.",
  icons: { icon: "/icon.svg" },
  manifest: "/manifest.webmanifest",
  robots: { index: false, follow: false }, // keep the site out of search results
};

export const viewport: Viewport = {
  themeColor: "#202B36",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
