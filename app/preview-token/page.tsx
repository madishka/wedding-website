import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PreviewSite } from "@/components/PreviewSite";

/**
 * Dev-only. What the REAL token page (/i/[token]) composes today, with
 * the preview's mock data: the scrubbed caldera hero and the RSVP
 * emblem, but solid dark sections — no mid clip (that one is still a
 * /preview-only experiment). This route answers "what would guests get
 * if we pushed right now" — keep it in sync with
 * app/i/[token]/page.tsx when features get promoted there.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Madelaine & Philip",
  description: "",
};

export default function PreviewTokenPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <PreviewSite midVideo={null} />;
}
