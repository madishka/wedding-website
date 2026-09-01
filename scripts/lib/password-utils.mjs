import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Household passwords.
 *
 * This lives in scripts/lib rather than lib/ because BOTH sides need it and
 * they must never disagree about the format: the CSV importer writes hashes,
 * the site verifies them. One implementation, one format, covered by
 * `npm test`. `lib/password.ts` is the typed door the app comes in through.
 *
 * scrypt from node:crypto — no dependency to add, and deliberately slow, so
 * the low-entropy passwords this site uses ("chen2027") cost real time to
 * guess even if the hashes ever leaked.
 */

// 128 * N * r = 16 MB per hash. Comfortably under Node's 32 MB scrypt cap,
// and ~100ms on a Vercel function — slow enough to matter, fast enough that
// a guest doesn't notice.
const N = 16384;
const R = 8;
const P = 1;
const KEYLEN = 32;
const SALT_BYTES = 16;

/**
 * What the guest types is never what we hash.
 *
 * Case is folded and whitespace collapsed on purpose. These passwords are
 * handed out over WhatsApp and typed on phones that auto-capitalise the
 * first letter and helpfully append a space — "Chen2027 " and "chen2027"
 * have to be the same password, or you will spend the year fielding "it
 * says my password is wrong" messages.
 *
 * The entropy this gives up is irrelevant: the password is a curtain over
 * a link that is already 109 unguessable bits. It is not the lock.
 *
 * @param {string} raw
 * @returns {string}
 */
export function normalizePassword(raw) {
  return String(raw ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Hash a password into a self-describing string:
 *
 *   scrypt$16384$8$1$<salt base64>$<hash base64>
 *
 * The parameters travel with the hash, so raising N later doesn't
 * invalidate every password already stored.
 *
 * @param {string} raw
 * @returns {string}
 */
export function hashPassword(raw) {
  const normalized = normalizePassword(raw);
  if (!normalized) throw new Error("Cannot hash an empty password.");

  const salt = randomBytes(SALT_BYTES);
  const hash = scryptSync(normalized, salt, KEYLEN, { N, r: R, p: P });

  return [
    "scrypt",
    N,
    R,
    P,
    salt.toString("base64"),
    hash.toString("base64"),
  ].join("$");
}

/**
 * Check a password against a stored hash. Constant-time.
 *
 * Returns false rather than throwing on a malformed hash — a corrupted row
 * should lock a household out and get noticed, not 500 the whole page.
 *
 * @param {string} raw
 * @param {string | null | undefined} stored
 * @returns {boolean}
 */
export function verifyPassword(raw, stored) {
  if (typeof stored !== "string" || !stored) return false;

  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const n = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p)) {
    return false;
  }
  // Refuse absurd parameters rather than letting a tampered row turn a
  // login attempt into a memory bomb.
  if (n < 1024 || n > 1 << 20 || r < 1 || r > 32 || p < 1 || p > 16) return false;

  let salt, expected;
  try {
    salt = Buffer.from(parts[4], "base64");
    expected = Buffer.from(parts[5], "base64");
  } catch {
    return false;
  }
  if (salt.length === 0 || expected.length === 0) return false;

  const normalized = normalizePassword(raw);
  if (!normalized) return false;

  let actual;
  try {
    actual = scryptSync(normalized, salt, expected.length, { N: n, r, p });
  } catch {
    return false;
  }

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
