import { NextResponse } from "next/server";
import { findInvite } from "@/lib/guests";

/**
 * Looks up a guest by name and reports whether their invite includes a
 * plus one. Deliberately does NOT reveal whether the name was found —
 * an unknown name simply gets no plus-one option.
 */
export async function GET(req: Request) {
  const name = new URL(req.url).searchParams.get("name") ?? "";
  const invite = findInvite(name);
  return NextResponse.json({ plusOneAllowed: invite?.plusOneAllowed ?? false });
}
