import test from "node:test";
import assert from "node:assert/strict";
import { mintToken, parseCsv, normalizeKey, toCsvUrl, fillDownHouseholds,
  ALPHABET, TOKEN_LENGTH } from "./import-utils.mjs";

test("parseCsv keeps commas inside quoted fields", () => {
  const rows = parseCsv('a,b,c\n1,"boat-party,wedding",3\n');
  assert.deepEqual(rows[1], ["1", "boat-party,wedding", "3"]);
});

test("parseCsv handles escaped quotes and embedded newlines", () => {
  const rows = parseCsv('note\n"she said ""yes""\nthen left"\n');
  assert.equal(rows[1][0], 'she said "yes"\nthen left');
});

test("parseCsv tolerates CRLF, a BOM, and trailing blank lines", () => {
  const rows = parseCsv('﻿household,name\r\nChen,Eric\r\n\r\n');
  assert.deepEqual(rows, [["household", "name"], ["Chen", "Eric"]]);
});

test("parseCsv keeps empty trailing cells", () => {
  const rows = parseCsv("a,b,c\nChen,,\n");
  assert.deepEqual(rows[1], ["Chen", "", ""]);
});

test("normalizeKey collapses the ways a household name gets retyped", () => {
  const canonical = normalizeKey("Eric & Rebecca Chen");
  for (const variant of [
    "eric & rebecca chen",
    "  Eric  &  Rebecca   Chen  ",
    "Eric and Rebecca Chen".replace(" and ", " & "),
    "Éric & Rebecca Chen",
  ]) {
    assert.equal(normalizeKey(variant), canonical, variant);
  }
});

test("normalizeKey keeps genuinely different households apart", () => {
  assert.notEqual(normalizeKey("Tom Whitfield"), normalizeKey("Tom Whitfeld"));
  assert.notEqual(normalizeKey("Aunt Sofia"), normalizeKey("Sofia Marino"));
});

test("mintToken has the right shape and alphabet", () => {
  for (let i = 0; i < 200; i++) {
    const t = mintToken();
    assert.equal(t.length, TOKEN_LENGTH);
    assert.match(t, /^[23456789abcdefghijkmnpqrstuvwxyz]{22}$/);
  }
});

test("mintToken does not repeat", () => {
  const seen = new Set();
  for (let i = 0; i < 5000; i++) seen.add(mintToken());
  assert.equal(seen.size, 5000);
});

test("mintToken is not biased toward the start of the alphabet", () => {
  // Rejection sampling should leave every character roughly equally
  // likely. A naive byte % 31 would over-produce the first 8 characters
  // by ~12%, which this catches.
  const counts = new Map([...ALPHABET].map((c) => [c, 0]));
  const draws = 200_000;
  for (let i = 0; i < draws / TOKEN_LENGTH; i++) {
    for (const c of mintToken()) counts.set(c, counts.get(c) + 1);
  }
  const expected = draws / ALPHABET.length;
  for (const [char, n] of counts) {
    const drift = Math.abs(n - expected) / expected;
    assert.ok(drift < 0.08, `"${char}" drifted ${(drift * 100).toFixed(1)}%`);
  }
});

test("toCsvUrl turns a Sheets edit link into a CSV export link", () => {
  assert.equal(
    toCsvUrl("https://docs.google.com/spreadsheets/d/1AbC-dEf_gH/edit#gid=0"),
    "https://docs.google.com/spreadsheets/d/1AbC-dEf_gH/export?format=csv&gid=0"
  );
});

test("toCsvUrl keeps the tab the URL actually points at", () => {
  // The failure this guards against is silent: lose the gid and you import
  // whichever sheet happens to be first, not the one you opened.
  for (const [url, gid] of [
    ["https://docs.google.com/spreadsheets/d/ID/edit#gid=123456", "123456"],
    ["https://docs.google.com/spreadsheets/d/ID/edit?gid=789#gid=789", "789"],
    ["https://docs.google.com/spreadsheets/d/ID/export?format=csv&gid=42", "42"],
  ]) {
    assert.equal(toCsvUrl(url).endsWith(`gid=${gid}`), true, url);
  }
});

test("toCsvUrl defaults to the first tab when no gid is given", () => {
  assert.equal(
    toCsvUrl("https://docs.google.com/spreadsheets/d/ID/edit"),
    "https://docs.google.com/spreadsheets/d/ID/export?format=csv&gid=0"
  );
});

test("toCsvUrl leaves a non-Sheets URL alone", () => {
  for (const url of [
    "https://example.com/guests.csv",
    "https://raw.githubusercontent.com/x/y/main/list.csv",
  ]) {
    assert.equal(toCsvUrl(url), url);
  }
});

test("a blank household means the same household as the row above", () => {
  // How a spreadsheet actually gets filled in: the name on the first row of
  // the household, blank underneath.
  const filled = fillDownHouseholds([
    { household: "Eric & Rebecca Chen", guest_name: "Eric Chen" },
    { household: "", guest_name: "Rebecca Chen" },
    { household: "", guest_name: "Mia Chen" },
    { household: "Aunt Sofia", guest_name: "Sofia Marino" },
    { household: "", guest_name: "" },
  ]);
  assert.deepEqual(filled.map((r) => r.household), [
    "Eric & Rebecca Chen",
    "Eric & Rebecca Chen",
    "Eric & Rebecca Chen",
    "Aunt Sofia",
    "Aunt Sofia",
  ]);
});

test("fillDownHouseholds leaves leading blanks blank to be reported", () => {
  // Nothing above to inherit from, so this stays an error rather than
  // silently inventing a household.
  const filled = fillDownHouseholds([
    { household: "", guest_name: "Orphan" },
    { household: "Chens", guest_name: "Eric" },
  ]);
  assert.equal(filled[0].household, "");
  assert.equal(filled[1].household, "Chens");
});

test("fillDownHouseholds does not mutate the rows it is given", () => {
  const original = [{ household: "Chens" }, { household: "" }];
  fillDownHouseholds(original);
  assert.equal(original[1].household, "");
});
