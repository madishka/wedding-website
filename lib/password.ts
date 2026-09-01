import "server-only";

/**
 * The app's typed door onto the password hashing.
 *
 * The implementation deliberately lives in scripts/lib/password-utils.mjs,
 * because the CSV importer writes the hashes that this side verifies and the
 * two must never disagree about the format. One implementation, one set of
 * tests (`npm test`), no chance of drift.
 */
export {
  hashPassword,
  verifyPassword,
  normalizePassword,
} from "@/scripts/lib/password-utils.mjs";
