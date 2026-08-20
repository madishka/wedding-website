#!/usr/bin/env node
/**
 * Guest list import: CSV → Supabase.
 *
 *   npm run import:guests -- --check            # read the CSV only, no database
 *   npm run import:guests -- --dry-run          # show what would change
 *   npm run import:guests                       # apply
 *   npm run import:guests -- --prune            # also remove dropped guests
 *
 * Safe to re-run. Households are matched on a normalized name, so editing
 * the spreadsheet and re-importing updates in place. Tokens are minted
 * once and never regenerated — re-running will not invalidate a link you
 * have already sent.
 *
 * Guests that disappear from the CSV are reported but NOT deleted unless
 * you pass --prune, because deleting a guest also deletes their RSVPs.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { mintToken, parseCsv, normalizeKey } from "./lib/import-utils.mjs";

// ── Args ──────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const CHECK = args.includes("--check");
const DRY_RUN = args.includes("--dry-run");
const PRUNE = args.includes("--prune");
const csvPath = args.find((a) => !a.startsWith("--")) ?? "scripts/guests.csv";

// ── Env ───────────────────────────────────────────────────────────────
loadEnvLocal();
const SITE_URL = process.env.SITE_URL ?? "http://localhost:3000";

/**
 * The client is built on first use, not at startup, so `--check` can read
 * and validate a spreadsheet before a Supabase project even exists.
 */
let _db = null;
function getDb() {
  if (_db) return _db;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    fail(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
        "Copy .env.local.example to .env.local and fill in both values\n" +
        "(Supabase dashboard → Project Settings → API).\n\n" +
        "To check your spreadsheet without a database:\n" +
        "  npm run import:guests -- --check"
    );
  }

  _db = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _db;
}

// ── Read + shape the CSV ──────────────────────────────────────────────
if (!existsSync(csvPath)) {
  fail(
    `No CSV at ${csvPath}.\n` +
      `Copy scripts/guests.sample.csv to scripts/guests.csv and edit it,\n` +
      `or pass a path: npm run import:guests -- path/to/list.csv`
  );
}

const rows = parseCsv(readFileSync(csvPath, "utf8"));
if (rows.length < 2) fail(`${csvPath} has a header but no guest rows.`);

const header = rows[0].map((h) => normalizeKey(h).replace(/-/g, "_"));
const need = ["household", "guest_name"];
for (const col of need) {
  if (!header.includes(col)) fail(`${csvPath} is missing a "${col}" column.`);
}

const records = rows.slice(1).map((cells) => {
  const rec = {};
  header.forEach((h, i) => (rec[h] = (cells[i] ?? "").trim()));
  return rec;
});

/** Group rows into households. Household-level fields come from whichever
 *  row supplies them first, so the spreadsheet only needs them once. */
const parties = new Map();
const problems = [];

records.forEach((rec, idx) => {
  const line = idx + 2; // 1-indexed, plus the header
  if (!rec.household) {
    problems.push(`line ${line}: no household name`);
    return;
  }
  const key = normalizeKey(rec.household);

  if (!parties.has(key)) {
    parties.set(key, {
      import_key: key,
      display_name: rec.household,
      contact_email: null,
      contact_phone: null,
      invited_via: null,
      notes: null,
      eventSlugs: [],
      guests: [],
    });
  }
  const party = parties.get(key);

  party.contact_email ||= rec.contact_email || null;
  party.contact_phone ||= rec.contact_phone || null;
  party.invited_via ||= rec.invited_via || null;
  party.notes ||= rec.notes || null;

  if (rec.events) {
    for (const slug of rec.events.split(/[,;]/)) {
      const s = normalizeKey(slug);
      if (s && !party.eventSlugs.includes(s)) party.eventSlugs.push(s);
    }
  }

  const type = (rec.guest_type || "adult").toLowerCase();
  if (!["adult", "child", "infant", "plus_one"].includes(type)) {
    problems.push(
      `line ${line}: guest_type "${rec.guest_type}" is not one of ` +
        `adult / child / infant / plus_one`
    );
    return;
  }

  const name = rec.guest_name || null;
  if (!name && type !== "plus_one") {
    problems.push(
      `line ${line}: a row with no guest_name must have guest_type "plus_one"`
    );
    return;
  }

  party.guests.push({
    // Stable per-household key, so re-importing updates rather than
    // duplicates. Unnamed slots fall back to their position.
    import_key: name ? normalizeKey(name) : `slot-${party.guests.length + 1}`,
    name,
    guest_type: type,
    sort_order: party.guests.length,
  });
});

if (CHECK) {
  // Spreadsheet check only — never touches the database, so it works
  // before Supabase exists. Event slugs are not verified here.
  console.log(`\n  ${csvPath}`);
  console.log(`  ${parties.size} households, ${records.length} guests\n`);
  for (const p of parties.values()) {
    const contact = p.contact_email || p.contact_phone || "no contact!";
    console.log(`  ${p.display_name}  —  ${contact}`);
    console.log(`    events: ${p.eventSlugs.join(", ") || "none"}`);
    for (const g of p.guests) {
      console.log(`    · ${g.name ?? "(unnamed slot)"} — ${g.guest_type}`);
    }
    console.log("");
  }
  if (problems.length) {
    console.error(`  ✗ ${problems.length} problem(s):\n`);
    problems.forEach((x) => console.error("     " + x));
    process.exit(1);
  }
  console.log("  ✓ no problems found\n");
  process.exit(0);
}

if (problems.length) {
  console.error(`\n✗ ${problems.length} problem(s) in ${csvPath}:\n`);
  problems.forEach((p) => console.error("   " + p));
  process.exit(1);
}

// ── Validate event slugs against the database ─────────────────────────
const { data: eventRows, error: eventErr } = await getDb()
  .from("events")
  .select("id, slug");
if (eventErr) fail(`Could not read events: ${eventErr.message}`);

const eventIdBySlug = new Map(eventRows.map((e) => [e.slug, e.id]));
const unknownSlugs = new Set();
for (const p of parties.values()) {
  for (const s of p.eventSlugs) if (!eventIdBySlug.has(s)) unknownSlugs.add(s);
}
if (unknownSlugs.size) {
  fail(
    `Unknown event slug(s): ${[...unknownSlugs].join(", ")}\n` +
      `Known slugs are: ${[...eventIdBySlug.keys()].join(", ")}\n` +
      `Add the event in supabase/schema.sql (and re-run it) first.`
  );
}

// ── Reconcile with what's already there ───────────────────────────────
const { data: existingParties, error: exErr } = await getDb()
  .from("parties")
  .select("id, import_key, token, display_name");
if (exErr) fail(`Could not read parties: ${exErr.message}`);

const existingByKey = new Map(existingParties.map((p) => [p.import_key, p]));

const toCreate = [];
const toUpdate = [];
for (const p of parties.values()) {
  const found = existingByKey.get(p.import_key);
  if (found) toUpdate.push({ ...p, id: found.id, token: found.token });
  else toCreate.push({ ...p, token: mintToken() });
}

const csvKeys = new Set(parties.keys());
const orphanParties = existingParties.filter((p) => !csvKeys.has(p.import_key));

console.log(`\n  ${csvPath}`);
console.log(`  ${parties.size} households, ${records.length} guests\n`);
console.log(`  new households    ${toCreate.length}`);
console.log(`  updated           ${toUpdate.length}`);
if (orphanParties.length) {
  console.log(`  in DB but not CSV ${orphanParties.length}  (left alone)`);
  orphanParties.forEach((p) => console.log(`      · ${p.display_name}`));
}

if (DRY_RUN) {
  console.log("\n  --dry-run: nothing written.\n");
  toCreate.forEach((p) => console.log(`  + ${p.display_name} (${p.guests.length})`));
  process.exit(0);
}

// ── Write ─────────────────────────────────────────────────────────────
let guestsAdded = 0;
let guestsOrphaned = 0;

for (const p of [...toCreate, ...toUpdate]) {
  const payload = {
    import_key: p.import_key,
    token: p.token,
    display_name: p.display_name,
    contact_email: p.contact_email,
    contact_phone: p.contact_phone,
    invited_via: p.invited_via,
    notes: p.notes,
  };

  const { data: saved, error } = await getDb()
    .from("parties")
    .upsert(payload, { onConflict: "import_key" })
    .select("id")
    .single();
  if (error) fail(`Saving "${p.display_name}": ${error.message}`);
  p.id = saved.id;

  // Guests: upsert on (party_id, import_key). Never a plain insert, or
  // a second import would double every household.
  const guestPayload = p.guests.map((g) => ({ ...g, party_id: p.id }));
  if (guestPayload.length) {
    const { error: gErr } = await getDb()
      .from("guests")
      .upsert(guestPayload, { onConflict: "party_id,import_key" });
    if (gErr) fail(`Saving guests for "${p.display_name}": ${gErr.message}`);
    guestsAdded += guestPayload.length;
  }

  // Guests that vanished from the CSV. Deleting cascades to their RSVPs,
  // so this needs an explicit --prune.
  const { data: dbGuests } = await getDb()
    .from("guests")
    .select("id, import_key, name")
    .eq("party_id", p.id);

  const wanted = new Set(p.guests.map((g) => g.import_key));
  const stale = (dbGuests ?? []).filter((g) => !wanted.has(g.import_key));
  for (const g of stale) {
    guestsOrphaned++;
    if (PRUNE) {
      await getDb().from("guests").delete().eq("id", g.id);
      console.log(`  - removed ${g.name ?? g.import_key} (${p.display_name})`);
    } else {
      console.log(
        `  ! ${g.name ?? g.import_key} (${p.display_name}) is in the DB ` +
          `but not the CSV — kept. Use --prune to delete.`
      );
    }
  }

  // Event invitations: replace wholesale. No RSVP data lives here, so
  // this is safe — but note that un-inviting a party from an event does
  // NOT delete RSVPs they already made for it.
  await getDb().from("party_events").delete().eq("party_id", p.id);
  const links = p.eventSlugs.map((slug) => ({
    party_id: p.id,
    event_id: eventIdBySlug.get(slug),
  }));
  if (links.length) {
    const { error: peErr } = await getDb().from("party_events").insert(links);
    if (peErr) fail(`Linking events for "${p.display_name}": ${peErr.message}`);
  }
}

// ── Emit the links to send ────────────────────────────────────────────
const outDir = path.join("scripts", "out");
mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "links.csv");

const csvOut = [
  ["household", "contact_email", "contact_phone", "invited_via", "guests", "link"],
  ...[...toCreate, ...toUpdate].map((p) => [
    p.display_name,
    p.contact_email ?? "",
    p.contact_phone ?? "",
    p.invited_via ?? "",
    String(p.guests.length),
    `${SITE_URL.replace(/\/$/, "")}/i/${p.token}`,
  ]),
]
  .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
  .join("\n");

writeFileSync(outPath, csvOut + "\n", "utf8");

console.log(`\n  ✓ ${parties.size} households, ${guestsAdded} guests written`);
if (guestsOrphaned && !PRUNE) {
  console.log(`  ! ${guestsOrphaned} guest(s) kept but missing from the CSV`);
}
console.log(`  ✓ links → ${outPath}`);
console.log(`\n  This file contains every guest's private link. It is`);
console.log(`  gitignored — don't commit it or paste it anywhere shared.\n`);

// ── Helpers ───────────────────────────────────────────────────────────
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
