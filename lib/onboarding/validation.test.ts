import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeInvitationEmail,
  validateActivationPassword,
  validateInvitationEmail,
} from "./validation.ts";

test("normalizes surrounding whitespace without changing the address", () => {
  assert.equal(
    normalizeInvitationEmail("  Cliente.Exemplo+tag@example.com  "),
    "Cliente.Exemplo+tag@example.com",
  );
});

test("rejects missing or malformed invitation email", () => {
  assert.equal(validateInvitationEmail("").ok, false);
  assert.equal(validateInvitationEmail("cliente").ok, false);
  assert.equal(validateInvitationEmail("cliente@example").ok, false);
});

test("accepts a plausible invitation email", () => {
  assert.deepEqual(validateInvitationEmail("cliente@example.com"), { ok: true });
});

test("requires at least eight password characters", () => {
  assert.equal(validateActivationPassword("1234567", "1234567").ok, false);
});

test("requires password confirmation to match", () => {
  assert.equal(
    validateActivationPassword("senha-segura", "senha-diferente").ok,
    false,
  );
});

test("accepts matching activation passwords", () => {
  assert.deepEqual(
    validateActivationPassword("senha-segura", "senha-segura"),
    { ok: true },
  );
});
