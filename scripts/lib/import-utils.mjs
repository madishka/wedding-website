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
