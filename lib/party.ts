import "server-only";
import { supabase } from "@/lib/supabase";
import { isValidTokenFormat } from "@/lib/types";
import type { Guest, Party, RsvpAnswer, WeddingEvent } from "@/lib/types";

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

  const { data, error } = await supabase
    .from("parties")
    .select(
      `id, token, display_name, contact_email, contact_phone,
       soft_response, soft_note,
       guests ( id, name, guest_type, sort_order ),
       party_events ( events ( * ) )`
    )
    .eq("token", token)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const guests: Guest[] = (data.guests ?? [])
    .map((g: any) => ({
      id: g.id,
      name: g.name,
      guestType: g.guest_type,
      sortOrder: g.sort_order,
    }))
    .sort((a: Guest, b: Guest) => a.sortOrder - b.sortOrder);

  const events: WeddingEvent[] = (data.party_events ?? [])
    .map((pe: any) => pe.events as EventRow)
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
    guests,
    events,
    rsvps,
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
