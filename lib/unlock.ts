import "server-only";
import { cookies } from "next/headers";
import {
  mintUnlockValue,
  verifyUnlockValue,
  deriveUnlockSecret,
} from "@/scripts/lib/unlock-utils.mjs";

/**
 * The unlock cookie: proof that this browser has already typed a
 * household's password.
 *
 * It is SIGNED, not a bare flag, so it cannot be forged — you cannot get in
 * by setting `wd_unlock=<someone's party id>` in devtools. The signing and
 * verification live in scripts/lib/unlock-utils.mjs so they are covered by
 * `npm test`; this file supplies the secret and reads the cookie jar.
 */

export const UNLOCK_COOKIE = "wd_unlock";

/** Matches the link cookie, so a guest types this at most once per device. */
export const UNLOCK_MAX_AGE = 60 * 60 * 24 * 730; // two years

let cachedSecret: Buffer | string | null = null;

/**
 * The signing key.
 *
 * Set UNLOCK_SECRET to a long random string (`openssl rand -base64 32`) if
 * you want a dedicated one. If you don't, it is derived from the service
 * role key — already a high-entropy, server-only secret this app cannot run
 * without — so there is nothing extra to configure in Vercel.
 *
 * Worth knowing: rotating the service role key invalidates every unlock
 * cookie, and guests re-type their password once. That is fine.
 */
function secret(): Buffer | string {
  if (cachedSecret) return cachedSecret;

  const explicit = process.env.UNLOCK_SECRET;
  if (explicit && explicit.length >= 16) {
    cachedSecret = explicit;
    return cachedSecret;
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error(
      "Cannot sign unlock cookies: set UNLOCK_SECRET, or make sure " +
        "SUPABASE_SERVICE_ROLE_KEY is present (the key is derived from it)."
    );
  }

  cachedSecret = deriveUnlockSecret(serviceKey);
  return cachedSecret;
}

/** The value to put in the cookie once a household types the right password. */
export function mintUnlockCookie(
  partyId: string,
  passwordSetAt: string | null
): string {
  return mintUnlockValue(secret(), partyId, passwordSetAt);
}

/**
 * Has THIS browser already unlocked this household?
 *
 * The one place the unlock cookie is read. Both the invitation page and the
 * RSVP endpoint go through it, which is what stops the two from drifting
 * apart and leaving one of them unguarded.
 */
export async function hasUnlockCookie(
  partyId: string,
  passwordSetAt: string | null
): Promise<boolean> {
  const jar = await cookies();
  return verifyUnlockValue(
    secret(),
    jar.get(UNLOCK_COOKIE)?.value,
    partyId,
    passwordSetAt
  );
}

// ── Attempt throttling ────────────────────────────────────────────────

/**
 * A sliding window per household, held in memory.
 *
 * Honest about what this is: on Vercel it is PER SERVERLESS INSTANCE, so an
 * attacker spread across instances gets more than MAX_ATTEMPTS. It is not
 * the security boundary — the 109-bit token in the URL is, and you need
 * that before you can even reach a password prompt. This exists to make
 * grinding through "smith2027, smith2026, smith25…" on a link somebody
 * genuinely holds slow and conspicuous rather than instant.
 *
 * If it ever needs to be real, move it to a Postgres table or Upstash; the
 * call sites don't change.
 */
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_TRACKED = 5000; // bound the map so a token-spray can't grow it forever

const attempts = new Map<string, number[]>();

export function tooManyAttempts(partyId: string): boolean {
  const now = Date.now();
  const recent = (attempts.get(partyId) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length === 0) attempts.delete(partyId);
  else attempts.set(partyId, recent);
  return recent.length >= MAX_ATTEMPTS;
}

export function recordFailedAttempt(partyId: string): void {
  const now = Date.now();

  if (attempts.size > MAX_TRACKED) {
    for (const [key, times] of attempts) {
      if (times.every((t) => now - t >= WINDOW_MS)) attempts.delete(key);
    }
    // Still full of live entries? Drop the oldest-inserted rather than grow.
    if (attempts.size > MAX_TRACKED) {
      const oldest = attempts.keys().next().value;
      if (oldest !== undefined) attempts.delete(oldest);
    }
  }

  const recent = (attempts.get(partyId) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  attempts.set(partyId, recent);
}

/** A correct password wipes the slate for that household. */
export function clearAttempts(partyId: string): void {
  attempts.delete(partyId);
}
