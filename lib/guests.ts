/**
 * The invite list — the source of truth for who gets a plus one.
 *
 * The RSVP form looks the guest up by name (normalized, so casing,
 * punctuation, and extra spaces don't matter) and only shows the
 * plus-one question when their invite allows it. Guests without a
 * plus one never see the option, so nothing needs to be "communicated"
 * — the form simply doesn't offer it.
 *
 * ⚠️ Placeholder data. Replace with your real guest list — and when the
 * full site moves to per-party token links, this list becomes a
 * `parties` table in Supabase and the lookup goes away entirely
 * (the token already knows who the guest is).
 */

export type Invite = {
  /** Full name as it appears on the invitation. */
  name: string;
  plusOneAllowed: boolean;
};

const GUEST_LIST: Invite[] = [
  { name: "Test Guest", plusOneAllowed: true },
  { name: "Jane Doe", plusOneAllowed: false },
  { name: "John Smith", plusOneAllowed: true },
];

export function normalizeName(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .replace(/[^a-z\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function findInvite(name: string): Invite | null {
  const n = normalizeName(name);
  if (!n) return null;
  return GUEST_LIST.find((g) => normalizeName(g.name) === n) ?? null;
}
