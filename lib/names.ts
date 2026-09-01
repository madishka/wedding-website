import type { Guest } from "@/lib/types";

/**
 * How a household is addressed in the welcome note.
 *
 * First names, because "Dear Eric, Rebecca and Mia" reads like a letter and
 * "Dear Chen Household" reads like a utility bill.
 *
 * Unnamed plus-one slots are the awkward case: the schema allows a guest row
 * with no name (someone invited with a guest we haven't been told about).
 * Dropping them silently would address a couple as one person, so they are
 * folded in as "guest" instead — "Dear Tom and guest".
 *
 * Falls back to the household's display name if nobody is named at all,
 * which should not happen but must not produce "Dear ,".
 */
export function householdGreeting(guests: Guest[], displayName: string): string {
  const named = guests
    .filter((g) => g.name)
    .map((g) => firstName(g.name!));

  const unnamed = guests.filter((g) => !g.name).length;
  if (unnamed > 0) named.push(unnamed === 1 ? "guest" : "guests");

  if (named.length === 0) return displayName;
  return formatList(named);
}

/** "Eric Chen" → "Eric". Anything without a space is already a first name. */
function firstName(full: string): string {
  return full.trim().split(/\s+/)[0];
}

/** ["a"] → "a"; ["a","b"] → "a and b"; ["a","b","c"] → "a, b and c". */
export function formatList(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}
