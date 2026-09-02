import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PasswordGate } from "@/components/PasswordGate";
import { PreviewSite } from "@/components/PreviewSite";

/** Dev-only. See components/PreviewSite.tsx. */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Madelaine & Philip",
  description: "",
};

export default async function PreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ gate?: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();

  // /preview?gate — the password screen on its own, so it can be designed
  // without minting a real link and setting a real password. The form will
  // not actually unlock anything here: there is no link cookie to say which
  // household it would be unlocking.
  if ("gate" in (await searchParams)) return <PasswordGate />;

  return <PreviewSite />;
}
