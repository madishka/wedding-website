import { NextResponse } from "next/server";
import { findInvite } from "@/lib/guests";
import { saveRsvp, type RsvpSubmission } from "@/lib/rsvp";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const name = typeof b.name === "string" ? b.name.trim() : "";
  const email = typeof b.email === "string" ? b.email.trim() : "";
  const attending = b.attending === "yes" || b.attending === "no" ? b.attending : null;
  const plusOneAttending =
    b.plusOneAttending === "yes" || b.plusOneAttending === "no"
      ? b.plusOneAttending
      : undefined;
  const plusOneName =
    typeof b.plusOneName === "string" ? b.plusOneName.trim().slice(0, 200) : "";
  const note = typeof b.note === "string" ? b.note.trim().slice(0, 1000) : undefined;

  if (!name || name.length > 200) {
    return NextResponse.json({ error: "Please tell us your name." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "That email doesn't look right." }, { status: 400 });
  }
  if (!attending) {
    return NextResponse.json({ error: "Please choose yes or no." }, { status: 400 });
  }

  // Server-side enforcement: only invites with a plus one may RSVP for one,
  // regardless of what the client sends.
  const invite = findInvite(name);
  const allowPlusOne = invite?.plusOneAllowed ?? false;

  const record: RsvpSubmission = {
    name,
    email,
    attending,
    ...(allowPlusOne && attending === "yes" && plusOneAttending
      ? {
          plusOneAttending,
          ...(plusOneAttending === "yes" && plusOneName
            ? { plusOneName }
            : {}),
        }
      : {}),
    note: note || undefined,
    submittedAt: new Date().toISOString(),
  };

  try {
    await saveRsvp(record);
  } catch (err) {
    console.error("Failed to save RSVP:", err);
    return NextResponse.json(
      { error: "Something went wrong saving your RSVP. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
