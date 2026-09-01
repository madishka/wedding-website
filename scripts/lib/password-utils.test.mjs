import test from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword, normalizePassword }
  from "./password-utils.mjs";

test("normalizePassword forgives how a phone retypes a password", () => {
  const canonical = normalizePassword("Chen 2027");
  for (const variant of [
    "chen 2027",
    "Chen 2027 ",
    "  CHEN   2027  ",
    "chen\t2027",
  ]) {
    assert.equal(normalizePassword(variant), canonical, variant);
  }
});

test("normalizePassword does not merge genuinely different passwords", () => {
  assert.notEqual(normalizePassword("chen2027"), normalizePassword("chen 2027"));
  assert.notEqual(normalizePassword("chen2027"), normalizePassword("chen2026"));
});

test("a hashed password verifies, however it was capitalised", () => {
  const stored = hashPassword("Chen2027");
  assert.equal(verifyPassword("Chen2027", stored), true);
  assert.equal(verifyPassword("chen2027", stored), true);
  assert.equal(verifyPassword(" CHEN2027 ", stored), true);
});

test("a wrong password does not verify", () => {
  const stored = hashPassword("chen2027");
  for (const wrong of ["chen2026", "chen", "", "  ", "chen2027x"]) {
    assert.equal(verifyPassword(wrong, stored), false, JSON.stringify(wrong));
  }
});

test("the same password hashes differently every time (it is salted)", () => {
  const a = hashPassword("chen2027");
  const b = hashPassword("chen2027");
  assert.notEqual(a, b);
  // ...and both still verify.
  assert.equal(verifyPassword("chen2027", a), true);
  assert.equal(verifyPassword("chen2027", b), true);
});

test("the hash carries its own parameters, so they can change later", () => {
  const [scheme, n, r, p, salt, hash] = hashPassword("chen2027").split("$");
  assert.equal(scheme, "scrypt");
  assert.equal(Number(n), 16384);
  assert.equal(Number(r), 8);
  assert.equal(Number(p), 1);
  assert.ok(Buffer.from(salt, "base64").length >= 16);
  assert.equal(Buffer.from(hash, "base64").length, 32);
});

test("an empty password is refused rather than hashed", () => {
  for (const empty of ["", "   ", null, undefined]) {
    assert.throws(() => hashPassword(empty));
  }
});

test("a malformed stored hash locks out instead of throwing", () => {
  for (const junk of [
    null,
    undefined,
    "",
    "not-a-hash",
    "scrypt$16384$8$1$only-five-parts",
    "bcrypt$16384$8$1$c2FsdA==$aGFzaA==",
    "scrypt$abc$8$1$c2FsdA==$aGFzaA==",
    "scrypt$16384$8$1$$",
  ]) {
    assert.equal(verifyPassword("chen2027", junk), false, String(junk));
  }
});

test("absurd scrypt parameters are refused, not executed", () => {
  // A tampered row must not turn one login attempt into a memory bomb.
  const bomb = `scrypt$${1 << 24}$8$1$c2FsdA==$aGFzaA==`;
  const started = process.hrtime.bigint();
  assert.equal(verifyPassword("chen2027", bomb), false);
  const ms = Number(process.hrtime.bigint() - started) / 1e6;
  assert.ok(ms < 100, `rejection should be instant, took ${ms}ms`);
});
