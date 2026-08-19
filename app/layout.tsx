import type { Metadata, Viewport } from "next";
// Self-hosted fonts (no request to Google at build or runtime)
import "@fontsource/italiana"; // display
import "@fontsource/imperial-script"; // script accents ("and", "by")
import "@fontsource-variable/jost"; // body
import "./globals.css";

export const metadata: Metadata = {
  title: "Madelaine & Philip · July 24, 2027 · Santorini",
  description:
    "Save the date — Madelaine and Philip are getting married on July 24, 2027 in Santorini, Greece.",
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
