import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getPartyByToken, saveSoftResponse } from "@/lib/party";
import { hasUnlockCookie } from "@/lib/unlock";

/**
 * The soft save-the-date reply.
 *
 * The household is resolved from the link cookie, never from the request
 * body — so this endpoint cannot be pointed at someone else's invitation
 * no matter what a client sends. Middleware already rejects requests
 * with no token cookie; this re-checks it against the database.
 */
export async function POST(req: Request) {
  const token = (await cookies()).get("wd_token")?.value;
  const party = token ? await getPartyByToken(token) : null;

  if (!party) {
    return NextResponse.json(
      { error: "We couldn't tell which invitation this is. Please reopen your personal link." },
      { status: 401 }
    );
  }

  // The password gate again, because the page's gate is not enough on its
  // own: middleware waves through ANY request carrying a shape-valid link
  // cookie, so without this check someone holding a leaked link could POST
  // straight here and answer for a household without ever passing the
  // password screen.
  if (
    party.hasPassword &&
    !(await hasUnlockCookie(party.id, party.passwordSetAt))
  ) {
    return NextResponse.json(
      { error: "Please enter your password first." },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const response = b.response === "yes" || b.response === "no" ? b.response : null;
  const email = typeof b.email === "string" ? b.email.trim() : "";
  const rawNote = typeof b.note === "string" ? b.note.trim() : "";
  const note = rawNote ? rawNote.slice(0, 1000) : null;

  if (!response) {
    return NextResponse.json(
      { error: "Please let us know whether you can make it." },
      { status: 400 }
    );
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320) {
    return NextResponse.json(
      { error: "That email doesn't look right." },
      { status: 400 }
    );
  }

  try {
    await saveSoftResponse(party.id, { response, email, note });
  } catch (err) {
    console.error("Failed to save soft RSVP:", err);
    return NextResponse.json(
      { error: "Something went wrong saving your reply. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
