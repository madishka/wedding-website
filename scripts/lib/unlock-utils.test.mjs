import test from "node:test";
import assert from "node:assert/strict";
import {
  mintUnlockValue,
  verifyUnlockValue,
  deriveUnlockSecret,
} from "./unlock-utils.mjs";

const SECRET = deriveUnlockSecret("service-role-key-pretend");
const PARTY = "8f1c2d3e-0000-4444-8888-abcdefabcdef";
const OTHER = "11112222-0000-4444-8888-abcdefabcdef";
const SET_AT = "2026-08-31T12:00:00.000Z";

test("a freshly minted cookie unlocks the household it was minted for", () => {
  const value = mintUnlockValue(SECRET, PARTY, SET_AT);
  assert.equal(verifyUnlockValue(SECRET, value, PARTY, SET_AT), true);
});

test("a cookie does not unlock a DIFFERENT household", () => {
  const value = mintUnlockValue(SECRET, PARTY, SET_AT);
  assert.equal(verifyUnlockValue(SECRET, value, OTHER, SET_AT), false);
});

test("changing the password logs already-unlocked devices out", () => {
  // This is the reason password_set_at is in the signature at all: reset a
  // leaked household's password and their old cookies must stop working.
  const before = mintUnlockValue(SECRET, PARTY, SET_AT);
  const after = "2026-09-01T09:30:00.000Z";
  assert.equal(verifyUnlockValue(SECRET, before, PARTY, after), false);
  assert.equal(
    verifyUnlockValue(SECRET, mintUnlockValue(SECRET, PARTY, after), PARTY, after),
    true
  );
});

test("a forged cookie does not get in", () => {
  // The attack this exists to stop: setting wd_unlock by hand in devtools.
  for (const forged of [
    PARTY,
    `${PARTY}.`,
    `${PARTY}.x`,
    `${PARTY}.${"A".repeat(43)}`,
    `${PARTY}.undefined`,
  ]) {
    assert.equal(verifyUnlockValue(SECRET, forged, PARTY, SET_AT), false, forged);
  }
});

test("a cookie signed with a different secret does not get in", () => {
  const otherSecret = deriveUnlockSecret("someone-elses-key");
  const value = mintUnlockValue(otherSecret, PARTY, SET_AT);
  assert.equal(verifyUnlockValue(SECRET, value, PARTY, SET_AT), false);
});

test("malformed cookie values are refused, not thrown on", () => {
  for (const junk of [null, undefined, "", ".", ".sig", "no-dot-at-all", 42, {}]) {
    assert.equal(verifyUnlockValue(SECRET, junk, PARTY, SET_AT), false, String(junk));
  }
});

test("a household with no password yet still signs and verifies", () => {
  // password_set_at is null until a password is first set.
  const value = mintUnlockValue(SECRET, PARTY, null);
  assert.equal(verifyUnlockValue(SECRET, value, PARTY, null), true);
  // And a cookie from the null era does not survive the first password.
  assert.equal(verifyUnlockValue(SECRET, value, PARTY, SET_AT), false);
});

test("the derived key is separate from the key it came from", () => {
  const serviceKey = "service-role-key-pretend";
  const derived = deriveUnlockSecret(serviceKey);
  assert.notEqual(derived.toString("utf8"), serviceKey);
  assert.equal(derived.length, 32);
  // Deterministic, or every deploy would log everyone out.
  assert.deepEqual(derived, deriveUnlockSecret(serviceKey));
  // ...and rotating the service key does change it.
  assert.notDeepEqual(derived, deriveUnlockSecret(serviceKey + "2"));
});
