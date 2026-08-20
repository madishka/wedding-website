#!/usr/bin/env node
/**
 * Seed / update the three events.
 *
 *   npm run seed:events
 *
 * Event copy lives here rather than in supabase/schema.sql on purpose:
 * this writes over the wire as UTF-8, so accented characters and the
 * "·" separator survive. Pasting SQL through the clipboard does not —
 * pbcopy without a UTF-8 locale re-encodes as Mac Roman and turns "·"
 * into "¬∑" in the database.
 *
 * Safe to re-run: upserts on slug. Edit the copy below and run again,
 * or edit it directly in the Supabase table editor — no deploy needed.
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";

const EVENTS = [
  {
    slug: "boat-party",
    name: "Boat party",
    date_label: "July 23 · Evening",
    starts_at: "2027-07-23T18:00:00+03:00",
    description:
      "The night before the wedding, we're taking to the water. Details on the meeting point, timing, and what to bring are coming with the invitation.",
    needs_meal_choice: false,
    meal_options: [],
    sort_order: 1,
  },
  {
    slug: "wedding",
    name: "The wedding",
    date_label: "July 24",
    starts_at: "2027-07-24T17:00:00+03:00",
    description:
      "A clifftop ceremony overlooking the caldera, followed by dinner and dancing. Venue details and timing to follow.",
    needs_meal_choice: true,
    meal_options: ["Fish", "Beef", "Vegetarian", "Kids menu"],
    sort_order: 2,
  },
  {
    slug: "pool-party",
    name: "Pool party",
    date_label: "July 25 · Morning",
    starts_at: "2027-07-25T11:00:00+03:00",
    description:
      "Ease into the day after with a slow morning by the pool. Location and timing to follow with the full itinerary.",
    needs_meal_choice: false,
    meal_options: [],
    sort_order: 3,
  },
];

for (const file of [".env.local", ".env"]) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("\n✗ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local\n");
  process.exit(1);
}

const db = createClient(url.trim().replace(/\/$/, ""), key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { error } = await db.from("events").upsert(EVENTS, { onConflict: "slug" });
if (error) {
  console.error(`\n✗ ${error.message}\n`);
  process.exit(1);
}

const { data } = await db.from("events").select("slug, date_label, description").order("sort_order");
console.log("");
for (const e of data) {
  console.log(`  \x1b[32m✓\x1b[0m ${e.date_label.padEnd(20)} ${e.slug}`);
  console.log(`    ${e.description.slice(0, 68)}…`);
}
console.log("");
