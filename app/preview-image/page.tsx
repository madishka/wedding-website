import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PasswordGate } from "@/components/PasswordGate";
import { PreviewSite } from "@/components/PreviewSite";

/** Dev-only. See components/PreviewSite.tsx. Photo backdrop. */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Madelaine & Philip",
  description: "",
};

export default async function PreviewImagePage({
  searchParams,
}: {
  searchParams: Promise<{ gate?: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  // ?gate previews the password screen — see app/preview/page.tsx.
  if ("gate" in (await searchParams)) return <PasswordGate />;
  return <PreviewSite heroBackdrop="image" />;
}
