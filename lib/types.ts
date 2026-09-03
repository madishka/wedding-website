/** Shared shapes for the token-gated side of the site. */

export type GuestType = "adult" | "child" | "infant" | "plus_one";

export type Guest = {
  id: string;
  /** Null for an unnamed slot (a plus one) the guest fills in at RSVP time. */
  name: string | null;
  guestType: GuestType;
  sortOrder: number;
};

export type WeddingEvent = {
  id: string;
  slug: string;
  name: string;
  dateLabel: string;
  startsAt: string | null;
  venue: string | null;
  /** Only ever rendered behind a token — never on the public page. */
  address: string | null;
  description: string | null;
  needsMealChoice: boolean;
  mealOptions: string[];
  sortOrder: number;
};

export type RsvpAnswer = {
  guestId: string;
  eventId: string;
  /** Null means "hasn't answered yet" — distinct from an explicit no. */
  attending: boolean | null;
  meal: string | null;
  dietary: string | null;
};

export type Party = {
  id: string;
  token: string;
  displayName: string;
  contactEmail: string | null;
  /** Wave-one save-the-date reply. Null = not answered yet. */
  softResponse: "yes" | "no" | null;
  softNote: string | null;

  /**
   * Whether this household's link asks for a password before showing
   * anything. False for every household that has not been given one.
   *
   * Note what is NOT here: the hash. It never travels on this object, so it
   * cannot be handed to a client component by accident. Only the unlock
   * route reads it, via getPartyAuthByToken().
   */
  hasPassword: boolean;

  /**
   * When the password last CHANGED. Not a secret — it is signed into the
   * unlock cookie so that a password reset invalidates every cookie minted
   * under the old one. See lib/unlock.ts.
   */
  passwordSetAt: string | null;
  guests: Guest[];
  /** ONLY the events this household is invited to. Filtered in the query. */
  events: WeddingEvent[];
  rsvps: RsvpAnswer[];
};

/** 22 chars from the token alphabet. Cheap format check before any DB hit. */
export const TOKEN_RE = /^[23456789abcdefghijkmnpqrstuvwxyz]{22}$/;

export function isValidTokenFormat(token: string | undefined | null): boolean {
  return typeof token === "string" && TOKEN_RE.test(token);
}
