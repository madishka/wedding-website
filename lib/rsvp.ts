import { promises as fs } from "fs";
import path from "path";

export type RsvpSubmission = {
  name: string;
  email: string;
  attending: "yes" | "no";
  /** Only present when the guest's invite includes a plus one. */
  plusOneAttending?: "yes" | "no";
  plusOneName?: string;
  note?: string;
  submittedAt: string; // ISO timestamp, set server-side
};

/**
 * ── Data layer stub ─────────────────────────────────────────────────
 *
 * Dev implementation: appends to data/rsvps.json so the form works
 * end-to-end locally with zero setup. This file is gitignored.
 *
 * ⚠️ This does NOT survive serverless deploys (Vercel filesystems are
 * ephemeral). Before sending the link to real guests, swap the body of
 * `saveRsvp` for the Supabase version sketched below — the rest of the
 * app never needs to change.
 *
 * Supabase version (after `npm i @supabase/supabase-js` and setting
 * SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local):
 *
 *   import { createClient } from "@supabase/supabase-js";
 *   const supabase = createClient(
 *     process.env.SUPABASE_URL!,
 *     process.env.SUPABASE_SERVICE_ROLE_KEY!
 *   );
 *   export async function saveRsvp(rsvp: RsvpSubmission) {
 *     const { error } = await supabase.from("rsvps").insert(rsvp);
 *     if (error) throw error;
 *   }
 *
 * Matching table:
 *
 *   create table rsvps (
 *     id uuid primary key default gen_random_uuid(),
 *     name text not null,
 *     email text not null,
 *     attending text not null check (attending in ('yes','no')),
 *     plus_one_attending text check (plus_one_attending in ('yes','no')),
 *     plus_one_name text,
 *     note text,
 *     submitted_at timestamptz not null default now()
 *   );
 * ────────────────────────────────────────────────────────────────────
 */

const STORE = path.join(process.cwd(), "data", "rsvps.json");

export async function saveRsvp(rsvp: RsvpSubmission): Promise<void> {
  let existing: RsvpSubmission[] = [];
  try {
    existing = JSON.parse(await fs.readFile(STORE, "utf8"));
  } catch {
    // first write, or unreadable file — start fresh
  }
  existing.push(rsvp);
  await fs.mkdir(path.dirname(STORE), { recursive: true });
  await fs.writeFile(STORE, JSON.stringify(existing, null, 2), "utf8");
}
