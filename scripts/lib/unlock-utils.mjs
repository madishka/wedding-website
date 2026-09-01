import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * The unlock cookie's signature.
 *
 * Pure — the secret is passed in — so it can be tested without a running
 * app, which matters more here than anywhere else in the codebase: this is
 * the code that decides whether a browser gets to see the invitation.
 * lib/unlock.ts is the thin layer that supplies the secret and reads the
 * actual cookie jar.
 *
 * The signature covers the party id AND the moment its password last
 * changed. That second half is the whole trick: reset a household's
 * password and every cookie minted under the old one stops verifying, so
 * every device that had already unlocked is logged back out. Without it,
 * changing the password on a link that leaked would evict nobody.
 */

const VERSION = "v1";

/** @param {Buffer|string} secret @param {string} partyId @param {string|null} passwordSetAt */
export function signUnlock(secret, partyId, passwordSetAt) {
  return createHmac("sha256", secret)
    .update(`${VERSION}:${partyId}:${passwordSetAt ?? ""}`)
    .digest("base64url");
}

/** The full cookie value: the party it is for, and the proof. */
export function mintUnlockValue(secret, partyId, passwordSetAt) {
  return `${partyId}.${signUnlock(secret, partyId, passwordSetAt)}`;
}

/**
 * Does this cookie value unlock this household at its CURRENT password?
 *
 * Constant-time, and false for anything malformed — a cookie for another
 * household, a truncated one, or one minted before a password reset.
 */
export function verifyUnlockValue(secret, value, partyId, passwordSetAt) {
  if (typeof value !== "string" || !value) return false;

  const dot = value.lastIndexOf(".");
  if (dot <= 0) return false;

  // Compared as a plain string: the party id is not a secret, and it is
  // checked before the signature so a mismatch costs nothing.
  if (value.slice(0, dot) !== partyId) return false;

  const expected = Buffer.from(signUnlock(secret, partyId, passwordSetAt), "utf8");
  const provided = Buffer.from(value.slice(dot + 1), "utf8");

  return (
    expected.length === provided.length && timingSafeEqual(expected, provided)
  );
}

/**
 * Derive the signing key from the Supabase service role key.
 *
 * The fixed label keeps this cryptographically separate from the key it
 * came from — it is a real derived key, not a reused one. Doing it this way
 * means there is no extra secret to configure in Vercel, which is the whole
 * reason it exists; set UNLOCK_SECRET instead if you'd rather have a
 * dedicated one.
 */
export function deriveUnlockSecret(serviceRoleKey) {
  return createHmac("sha256", serviceRoleKey).update("wd-unlock-key-v1").digest();
}
