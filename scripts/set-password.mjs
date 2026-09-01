#!/usr/bin/env node
/**
 * Household passwords, one at a time: npm run password
 *
 *   npm run password -- --list                       # who has one
 *   npm run password -- "Eric & Rebecca Chen"        # set a generated one
 *   npm run password -- "Eric & Rebecca Chen" chen418  # set a specific one
 *   npm run password -- --clear "Aunt Sofia"         # remove it
 *   npm run password -- --all                        # generate for everyone
 *                                                    # who doesn't have one
 *
 * The spreadsheet route (a `password` column + `npm run import:guests`) is
 * the one to use when you're setting up or changing many at once. This is
 * for the single "they've lost it / that link got forwarded" reset, without
 * having to open the CSV.
 *
 * Setting a password ALWAYS logs that household's already-unlocked devices
 * out, which is the point of a reset. Nothing else about the household is
 * touched — not their link, not their RSVP.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { randomInt } from "node:crypto";
import path from "node:path";
import { normalizeKey } from "./lib/import-utils.mjs";
import { hashPassword } from "./lib/password-utils.mjs";

const args = process.argv.slice(2);
const LIST = args.includes("--list");
const CLEAR = args.includes("--clear");
const ALL = args.includes("--all");
const positional = args.filter((a) => !a.startsWith("--"));

loadEnvLocal();

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  fail(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Copy .env.local.example to .env.local and fill in both values."
  );
}
const db = createClient(url.trim().replace(/\/$/, ""), key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: households, error } = await db
  .from("parties")
  .select("id, import_key, display_name, password_hash, password_set_at")
  .order("display_name");
if (error) {
  // The most likely reason by far, and the raw Postgres error is no help.
  if (/password_hash/.test(error.message ?? "")) {
    fail(
      "The password columns aren't in your database yet.\n\n" +
        "Supabase → SQL Editor → New query → paste all of\n" +
        "supabase/schema.sql → Run. It is safe to re-run.\n\n" +
        "Shortcut (macOS): cat supabase/schema.sql | pbcopy"
    );
  }
  fail(`Could not read households: ${error.message}`);
}
if (!households.length) {
  fail("No households yet. Run `npm run import:guests` first.");
}

// ── --list ────────────────────────────────────────────────────────────
if (LIST) {
  console.log(`\n  ${households.length} households\n`);
  for (const h of households) {
    const when = h.password_set_at
      ? new Date(h.password_set_at).toISOString().slice(0, 10)
      : "";
    console.log(
      h.password_hash
        ? `  \x1b[32m🔒\x1b[0m ${h.display_name}  —  password set ${when}`
        : `  \x1b[33m○\x1b[0m  ${h.display_name}  —  no password, link opens straight through`
    );
  }
  // The hash is one-way. If a password is lost, it is lost — reset it.
  console.log(`\n  Passwords are hashed, so they can't be read back.`);
  console.log(`  Lost one? Set a new one: npm run password -- "Name"\n`);
  process.exit(0);
}

// ── --all ─────────────────────────────────────────────────────────────
if (ALL) {
  const missing = households.filter((h) => !h.password_hash);
  if (!missing.length) {
    console.log("\n  Every household already has a password. Nothing to do.\n");
    process.exit(0);
  }

  const rows = [];
  for (const h of missing) {
    const password = generatePassword(h.display_name);
    await write(h, password);
    rows.push([h.display_name, password]);
    console.log(`  \x1b[32m✓\x1b[0m ${h.display_name}  →  ${password}`);
  }

  const outDir = path.join("scripts", "out");
  mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "passwords.csv");
  writeFileSync(
    outPath,
    [["household", "password"], ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n") + "\n",
    "utf8"
  );

  console.log(`\n  ✓ ${rows.length} passwords set`);
  console.log(`  ✓ written to ${outPath}`);
  console.log(`\n  That file is the only plaintext copy. It is gitignored —`);
  console.log(`  keep it somewhere you'll still have it in a year.\n`);
  process.exit(0);
}

// ── Set or clear one household ────────────────────────────────────────
const [nameArg, passwordArg] = positional;
if (!nameArg) {
  fail(
    "Which household?\n\n" +
      '  npm run password -- "Eric & Rebecca Chen"\n' +
      '  npm run password -- "Eric & Rebecca Chen" chen418\n' +
      '  npm run password -- --clear "Aunt Sofia"\n' +
      "  npm run password -- --list\n" +
      "  npm run password -- --all"
  );
}

const wanted = normalizeKey(nameArg);
let match = households.find((h) => h.import_key === wanted);

// Not an exact name? Fall back to a contains search, so you can type
// "chen" instead of "Eric & Rebecca Chen".
if (!match) {
  const near = households.filter((h) => h.import_key.includes(wanted));
  if (near.length === 1) match = near[0];
  else if (near.length > 1) {
    fail(
      `"${nameArg}" matches ${near.length} households:\n` +
        near.map((h) => `  · ${h.display_name}`).join("\n") +
        "\n\nBe more specific."
    );
  } else {
    fail(
      `No household matching "${nameArg}".\n` +
        "See them all with: npm run password -- --list"
    );
  }
}

if (CLEAR) {
  const { error: clearErr } = await db
    .from("parties")
    .update({ password_hash: null, password_set_at: null })
    .eq("id", match.id);
  if (clearErr) fail(`Could not clear it: ${clearErr.message}`);

  console.log(`\n  ✓ password removed for ${match.display_name}`);
  console.log(`  Their link now opens straight to the invitation.\n`);
  process.exit(0);
}

const password = passwordArg || generatePassword(match.display_name);
await write(match, password);

console.log(`\n  ✓ ${match.display_name}`);
console.log(`    password: \x1b[1m${password}\x1b[0m`);
if (match.password_hash) {
  console.log(`\n  This replaced their old password, so anyone already`);
  console.log(`  logged in on a device has been logged back out.`);
}
console.log(`\n  Write it down now — it's hashed, so it can't be read back.\n`);

// ── Helpers ───────────────────────────────────────────────────────────

async function write(household, password) {
  const { error: writeErr } = await db
    .from("parties")
    .update({
      password_hash: hashPassword(password),
      password_set_at: new Date().toISOString(),
    })
    .eq("id", household.id);
  if (writeErr) fail(`Could not set it: ${writeErr.message}`);
}

/**
 * A password from the household's own name plus three random digits —
 * "Eric & Rebecca Chen" → "chen418".
 *
 * Easy to read out over the phone and to retype on a keyboard that keeps
 * autocapitalising. The digits are what stop it being guessable from the
 * name alone, which is the only guessing that realistically matters here:
 * you already need the 109-bit link to reach the password prompt at all.
 */
function generatePassword(displayName) {
  const words = normalizeKey(displayName).split("-").filter(Boolean);
  // Last word is the surname in "Eric & Rebecca Chen" and in "Aunt Sofia".
  const stem = words[words.length - 1] ?? "guest";
  return `${stem}${randomInt(100, 1000)}`;
}

function loadEnvLocal() {
  for (const file of [".env.local", ".env"]) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const value = m[2].replace(/^["']|["']$/g, "");
      if (!process.env[m[1]]) process.env[m[1]] = value;
    }
  }
}

function fail(msg) {
  console.error(`\n✗ ${msg}\n`);
  process.exit(1);
}
