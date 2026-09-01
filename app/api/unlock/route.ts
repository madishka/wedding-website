import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getPartyAuthByToken } from "@/lib/party";
import { verifyPassword } from "@/lib/password";
import {
  UNLOCK_COOKIE,
  UNLOCK_MAX_AGE,
  mintUnlockCookie,
  tooManyAttempts,
  recordFailedAttempt,
  clearAttempts,
} from "@/lib/unlock";

/**
 * Typing a household's password.
 *
 * Which household is being unlocked comes from the link cookie, exactly as
 * it does for the soft RSVP — never from the request body. So this endpoint
 * cannot be aimed at a different household's password no matter what a
 * client sends: you can only ever attempt the password for the link you
 * actually hold.
 */
export async function POST(req: Request) {
  const token = (await cookies()).get("wd_token")?.value;
  const party = token ? await getPartyAuthByToken(token) : null;

  if (!party) {
    return NextResponse.json(
      {
        error:
          "We couldn't tell which invitation this is. Please reopen your personal link.",
      },
      { status: 401 }
    );
  }

  // No password on this household: nothing to unlock, and saying so is
  // harmless — they already hold the link.
  if (!party.passwordHash) {
    return NextResponse.json({ ok: true });
  }

  if (tooManyAttempts(party.id)) {
    return NextResponse.json(
      {
        error:
          "That's a few too many tries. Give it ten minutes, or message us and we'll just tell you.",
      },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const raw = (body as Record<string, unknown>).password;
  // Bounded before it reaches scrypt: an unbounded string here would be a
  // free way to make the server do arbitrary work.
  const password = typeof raw === "string" ? raw.slice(0, 200) : "";

  if (!password.trim()) {
    return NextResponse.json(
      { error: "Please enter the password from your invitation." },
      { status: 400 }
    );
  }

  if (!verifyPassword(password, party.passwordHash)) {
    recordFailedAttempt(party.id);
    return NextResponse.json(
      { error: "That's not it. Check the message we sent you." },
      { status: 401 }
    );
  }

  clearAttempts(party.id);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(UNLOCK_COOKIE, mintUnlockCookie(party.id, party.passwordSetAt), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: UNLOCK_MAX_AGE,
    path: "/",
  });
  return res;
}
