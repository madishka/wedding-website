#!/usr/bin/env node
/**
 * Setup doctor: npm run check
 *
 * Walks the same path the app does — env, connection, schema, seed data —
 * and says exactly which step is incomplete and how to finish it.
 * Read-only: it never writes to the database.
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";

let failed = false;
const ok = (m) => console.log(`  \x1b[32m✓\x1b[0m ${m}`);
const bad = (m, fix) => {
  failed = true;
  console.log(`  \x1b[31m✗\x1b[0m ${m}`);
  if (fix) fix.split("\n").forEach((l) => console.log(`      ${l}`));
};

console.log("\n  Wedding site setup\n");

// ── 1. .env.local ─────────────────────────────────────────────────────
if (!existsSync(".env.local")) {
  bad("no .env.local", "cp .env.local.example .env.local\nthen fill in the two Supabase values");
  console.log("");
  process.exit(1);
}
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
ok(".env.local found");

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || url.includes("YOUR-PROJECT")) {
  bad("SUPABASE_URL not set", "Supabase → Project Settings → API → Project URL");
} else if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url.trim())) {
  bad(`SUPABASE_URL looks wrong: ${url}`, "Expected https://YOUR-PROJECT.supabase.co");
} else ok("SUPABASE_URL looks right");

if (!key) {
  bad("SUPABASE_SERVICE_ROLE_KEY not set", "Supabase → Project Settings → API → service_role key");
} else if (key.length < 40) {
  bad("SUPABASE_SERVICE_ROLE_KEY looks too short", "Copy the whole key — it's long.");
} else {
  // The anon key is the easy mistake: it looks similar and fails silently
  // later with confusing empty results, because RLS blocks everything.
  try {
    const claims = JSON.parse(
      Buffer.from(key.split(".")[1], "base64").toString("utf8")
    );
    if (claims.role === "anon") {
      bad(
        "that's the ANON key, not the service role key",
        "RLS is on with no policies, so the anon key can read nothing.\n" +
          "Project Settings → API → service_role (click 'Reveal')"
      );
    } else if (claims.role === "service_role") {
      ok("service role key (correct one)");
    } else {
      ok("key present");
    }
  } catch {
    ok("key present");
  }
}

if (failed) { console.log(""); process.exit(1); }

// ── 2. Connection + schema ────────────────────────────────────────────
const db = createClient(url.trim().replace(/\/$/, ""), key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const TABLES = ["parties", "guests", "events", "party_events", "rsvps"];
let schemaMissing = false;

for (const table of TABLES) {
  const { error } = await db.from(table).select("*", { count: "exact", head: true });
  if (error) {
    if (/does not exist|schema cache|Could not find/i.test(error.message)) {
      bad(`table "${table}" missing`);
      schemaMissing = true;
    } else if (/fetch failed|ENOTFOUND/i.test(error.message)) {
      bad(
        "can't reach Supabase",
        "Check SUPABASE_URL, your network, and that the project isn't paused."
      );
      console.log("");
      process.exit(1);
    } else {
      bad(`"${table}": ${error.message}`);
    }
  }
}

if (schemaMissing) {
  bad(
    "schema not installed",
    "Supabase → SQL Editor → New query → paste all of\n" +
      "supabase/schema.sql → Run.\n\n" +
      "Shortcut (macOS): cat supabase/schema.sql | pbcopy"
  );
  console.log("");
  process.exit(1);
}
ok("all five tables exist");

// ── 3. Seed data ──────────────────────────────────────────────────────
const { data: events } = await db.from("events").select("slug, name, date_label").order("sort_order");
if (!events?.length) {
  bad("no events seeded", "npm run seed:events");
} else {
  ok(`${events.length} events: ${events.map((e) => e.slug).join(", ")}`);

  // Mojibake check. Clipboard-pasted SQL can arrive Mac Roman-encoded,
  // which turns "·" into "¬∑" — invisible until it renders on the page.
  const mangled = events.filter((e) => /Â|¬|∑|â€/.test(e.date_label ?? ""));
  if (mangled.length) {
    bad(
      `${mangled.length} event(s) have corrupted characters: ${mangled
        .map((e) => JSON.stringify(e.date_label))
        .join(", ")}`,
      "npm run seed:events    (rewrites them as proper UTF-8)"
    );
  } else ok("event text encoding is clean");
}

// The soft-reply columns arrived after the first schema draft.
const { error: softErr } = await db.from("parties").select("soft_response").limit(1);
if (softErr) {
  bad("parties.soft_response missing", "Re-run supabase/schema.sql to pick up the newer columns.");
} else ok("soft-reply columns present");

// So are the password columns.
const { error: pwErr } = await db.from("parties").select("password_hash").limit(1);
if (pwErr) {
  bad(
    "parties.password_hash missing",
    "Re-run supabase/schema.sql to pick up the password columns.\n" +
      "Until then every link opens without a password."
  );
} else ok("password columns present");

// ── 4. Data so far ────────────────────────────────────────────────────
const { count: partyCount } = await db.from("parties").select("*", { count: "exact", head: true });
const { count: guestCount } = await db.from("guests").select("*", { count: "exact", head: true });

console.log("");
if (!partyCount) {
  console.log("  No households imported yet. Next:\n");
  console.log("    cp scripts/guests.template.csv scripts/guests.csv");
  console.log("    npm run import:guests -- --check");
  console.log("    npm run import:guests\n");
} else {
  ok(`${partyCount} households, ${guestCount} guests imported`);
  const { count: replied } = await db
    .from("parties")
    .select("*", { count: "exact", head: true })
    .not("soft_response", "is", null);
  console.log(`  \x1b[32m✓\x1b[0m ${replied ?? 0} have replied`);

  if (!pwErr) {
    const { count: locked } = await db
      .from("parties")
      .select("*", { count: "exact", head: true })
      .not("password_hash", "is", null);
    // Not a failure. No password is a perfectly valid configuration —
    // the link token is the real credential either way.
    console.log(
      `  \x1b[32m✓\x1b[0m ${locked ?? 0} of ${partyCount} have a password` +
        (locked ? "" : "   (npm run password -- --all)")
    );
  }
  console.log("");
}

if (failed) process.exit(1);
console.log("  \x1b[32mSetup looks good.\x1b[0m\n");
