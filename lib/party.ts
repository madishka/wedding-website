import "server-only";
import { supabase } from "@/lib/supabase";
import { isValidTokenFormat } from "@/lib/types";
import type { Guest, Party, RsvpAnswer, WeddingEvent } from "@/lib/types";

const SELECT_WITHOUT_PASSWORD = `id, token, display_name, contact_email, contact_phone,
   soft_response, soft_note,
   guests ( id, name, guest_type, sort_order ),
   party_events ( events ( * ) )`;

const SELECT_WITH_PASSWORD = `id, token, display_name, contact_email, contact_phone,
   soft_response, soft_note, password_hash, password_set_at,
   guests ( id, name, guest_type, sort_order ),
   party_events ( events ( * ) )`;

/**
 * The row those two selects return.
 *
 * Spelled out rather than inferred: supabase-js infers the shape from a
 * LITERAL select string, and we choose between two at runtime. The password
 * fields are optional because the narrower select omits them entirely.
 */
type PartyRow = {
  id: string;
  token: string;
  display_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  soft_response: "yes" | "no" | null;
  soft_note: string | null;
  password_hash?: string | null;
  password_set_at?: string | null;
  guests: Array<{
    id: string;
    name: string | null;
    guest_type: Guest["guestType"];
    sort_order: number;
  }> | null;
  party_events: Array<{ events: EventRow | null }> | null;
};

/**
 * Log the missing-columns warning once per process, not once per request.
 *
 * Note this gates only the LOGGING, not the query: every request keeps
 * trying the full select. That costs a wasted query per request while the
 * migration is outstanding — which is precisely when nobody is using the
 * site — and it means passwords start working the moment the SQL is run,
 * with no restart. A flag that latched the fallback off would leave a warm
 * server serving password-less links until it happened to recycle.
 */
let warnedAboutColumns = false;

/** PostgREST surfaces Postgres 42703 (undefined_column) as a 42703 code. */
function isMissingColumn(error: { code?: string; message?: string }): boolean {
  return (
    error.code === "42703" ||
    /column .*password_(hash|set_at).* does not exist/i.test(error.message ?? "")
  );
}

type EventRow = {
  id: string;
  slug: string;
  name: string;
  date_label: string;
  starts_at: string | null;
  venue: string | null;
  address: string | null;
  description: string | null;
  needs_meal_choice: boolean;
  meal_options: string[] | null;
  sort_order: number;
};

/**
 * Look a household up by its link token.
 *
 * The events come back through `party_events`, so a party only ever
 * receives the events it was actually invited to. Nothing is filtered
 * in the browser — an uninvited event never enters the response at all.
 */
export async function getPartyByToken(token: string): Promise<Party | null> {
  if (!isValidTokenFormat(token)) return null;

  let { data, error } = await supabase
    .from("parties")
    .select(SELECT_WITH_PASSWORD)
    .eq("token", token)
    .maybeSingle<PartyRow>();

  // Migration window. If the code is deployed before supabase/schema.sql is
  // re-run, those two columns don't exist yet and this query fails — which
  // would break EVERY guest link at once, for a feature nobody has switched
  // on. So we notice, drop them, and carry on serving the invitation with no
  // password. `npm run check` says loudly that the migration is outstanding.
  if (error && isMissingColumn(error)) {
    if (!warnedAboutColumns) {
      warnedAboutColumns = true;
      console.warn(
        "parties.password_hash is missing — serving links without passwords. " +
          "Re-run supabase/schema.sql to enable them."
      );
    }
    ({ data, error } = await supabase
      .from("parties")
      .select(SELECT_WITHOUT_PASSWORD)
      .eq("token", token)
      .maybeSingle<PartyRow>());
  }

  if (error) throw error;
  if (!data) return null;

  const guests: Guest[] = (data.guests ?? [])
    .map((g) => ({
      id: g.id,
      name: g.name,
      guestType: g.guest_type,
      sortOrder: g.sort_order,
    }))
    .sort((a: Guest, b: Guest) => a.sortOrder - b.sortOrder);

  const events: WeddingEvent[] = (data.party_events ?? [])
    .map((pe) => pe.events as EventRow)
    .filter(Boolean)
    .map((e: EventRow) => ({
      id: e.id,
      slug: e.slug,
      name: e.name,
      dateLabel: e.date_label,
      startsAt: e.starts_at,
      venue: e.venue,
      address: e.address,
      description: e.description,
      needsMealChoice: e.needs_meal_choice,
      mealOptions: e.meal_options ?? [],
      sortOrder: e.sort_order,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const rsvps = await getRsvps(guests.map((g) => g.id));

  return {
    id: data.id,
    token: data.token,
    displayName: data.display_name,
    contactEmail: data.contact_email,
    contactPhone: data.contact_phone,
    softResponse: data.soft_response,
    softNote: data.soft_note,
    // Boolean, not the hash: see the note on Party.hasPassword.
    hasPassword: Boolean(data.password_hash),
    passwordSetAt: data.password_set_at ?? null,
    guests,
    events,
    rsvps,
  };
}

/**
 * The password hash for a household, and nothing else.
 *
 * Deliberately separate from getPartyByToken: the hash is read in exactly
 * one place (app/api/unlock/route.ts) and never rides along on the object
 * the page renders from, so it cannot be leaked into the browser by a
 * future component that spreads `party` into props.
 */
export async function getPartyAuthByToken(
  token: string
): Promise<{ id: string; passwordHash: string | null; passwordSetAt: string | null } | null> {
  if (!isValidTokenFormat(token)) return null;

  const { data, error } = await supabase
    .from("parties")
    .select("id, password_hash, password_set_at")
    .eq("token", token)
    .maybeSingle();

  // Same migration window as above: no password columns means no password
  // to check, so there is nothing to unlock.
  if (error && isMissingColumn(error)) return null;
  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    passwordHash: data.password_hash,
    passwordSetAt: data.password_set_at,
  };
}

async function getRsvps(guestIds: string[]): Promise<RsvpAnswer[]> {
  if (guestIds.length === 0) return [];
  const { data, error } = await supabase
    .from("rsvps")
    .select("guest_id, event_id, attending, meal, dietary")
    .in("guest_id", guestIds);

  if (error) throw error;
  return (data ?? []).map((r) => ({
    guestId: r.guest_id,
    eventId: r.event_id,
    attending: r.attending,
    meal: r.meal,
    dietary: r.dietary,
  }));
}

/**
 * Stamp the first time a household opened their link — the "who hasn't
 * looked at this yet" half of the invite tracker. Best-effort: a failure
 * here must never stop the page from rendering.
 */
export async function markOpened(partyId: string): Promise<void> {
  try {
    await supabase
      .from("parties")
      .update({ first_opened_at: new Date().toISOString() })
      .eq("id", partyId)
      .is("first_opened_at", null);
  } catch (err) {
    console.error("Could not stamp first_opened_at:", err);
  }
}

/**
 * Record a household's soft save-the-date reply.
 *
 * Also updates the contact email, since confirming it is half the point
 * of this first wave — it's where the real invitation will be sent.
 */
export async function saveSoftResponse(
  partyId: string,
  input: { response: "yes" | "no"; email: string; note: string | null }
): Promise<void> {
  const { error } = await supabase
    .from("parties")
    .update({
      soft_response: input.response,
      soft_responded_at: new Date().toISOString(),
      soft_note: input.note,
      contact_email: input.email,
    })
    .eq("id", partyId);

  if (error) throw error;
}
