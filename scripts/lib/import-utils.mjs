import { randomBytes } from "node:crypto";

/**
 * 31 unambiguous characters — no 0/1/l/o, so a token survives being read
 * aloud or retyped. 22 of them is ~109 bits: unguessable.
 */
export const ALPHABET = "23456789abcdefghijkmnpqrstuvwxyz";
export const TOKEN_LENGTH = 22;

export function mintToken(length = TOKEN_LENGTH) {
  const limit = 256 - (256 % ALPHABET.length);
  const out = [];
  while (out.length < length) {
    for (const byte of randomBytes(length)) {
      // Rejection sampling. Taking the modulo of every byte would bias
      // the alphabet's first characters, since 256 isn't a multiple of 31.
      if (byte >= limit) continue;
      out.push(ALPHABET[byte % ALPHABET.length]);
      if (out.length === length) break;
    }
  }
  return out.join("");
}

/** Minimal CSV reader: quoted fields, embedded commas and newlines. */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  const src = text.replace(/^﻿/, "").replace(/\r\n?/g, "\n");

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else field += c;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

/** Household names → a stable key, so "Eric & Rebecca Chen" survives
 *  re-typing, casing changes, and accents without duplicating the party. */
export function normalizeKey(raw) {
  return String(raw)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * A Google Sheets "edit" URL → the CSV export of the tab it points at.
 *
 * The gid matters: it identifies WHICH TAB. Defaulting it away would
 * silently import the first sheet in the workbook no matter which one the
 * URL named, so a second tab of notes could quietly replace the guest list.
 *
 * Any non-Sheets URL is returned untouched, so a raw CSV link works too.
 */
export function toCsvUrl(source) {
  const m = String(source).match(
    /docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/
  );
  if (!m) return source;
  // On an edit link the tab id is in the fragment; elsewhere it's a query
  // parameter. Both are covered rather than assuming one shape.
  const gid = String(source).match(/[#&?]gid=([0-9]+)/)?.[1] ?? "0";
  return `https://docs.google.com/spreadsheets/d/${m[1]}/export?format=csv&gid=${gid}`;
}

/**
 * Fill the Household column downwards.
 *
 * A blank Household means "same household as the row above" — which is how
 * people actually fill in a spreadsheet, and what you get for free by
 * dragging one row down. Requiring it on every row made the second person in
 * every household an error, which is a bad trade for a column whose whole
 * job is to say "these people are together".
 *
 * Only the FIRST rows can genuinely lack a household, since there is nothing
 * above them to inherit from; those are left blank for the caller to report.
 *
 * Mutates nothing — returns new records.
 */
export function fillDownHouseholds(records) {
  let last = "";
  return records.map((rec) => {
    if (rec.household) last = rec.household;
    return rec.household ? rec : { ...rec, household: last };
  });
}
