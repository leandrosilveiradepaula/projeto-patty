import assert from "node:assert/strict";
import test from "node:test";
import { parseAccessPasswordForm, readSingleStringFormValue } from "./validation.ts";

test("password mutation requires exactly one plain text value per credential field", () => {
  const form = new FormData();
  form.set("password", "long-enough-secret");
  form.set("passwordConfirmation", "long-enough-secret");
  const valid = parseAccessPasswordForm(form);
  assert.equal(valid.ok, true);
  if (valid.ok) assert.equal(valid.password, "long-enough-secret");
  form.append("password", "another-secret");
  assert.equal(parseAccessPasswordForm(form).ok, false);
});

test("malformed, missing or uploaded password field is rejected rather than calling Auth", () => {
  const form = new FormData();
  form.set("password", new File(["secret"], "password.txt"));
  form.set("passwordConfirmation", "long-enough-secret");
  assert.equal(parseAccessPasswordForm(form).ok, false);
  assert.equal(readSingleStringFormValue(form, "password"), null);
  form.set("password", "short");
  assert.equal(parseAccessPasswordForm(form).ok, false);
  form.set("password", "long-enough-secret");
  form.set("passwordConfirmation", "wrong-secret");
  assert.equal(parseAccessPasswordForm(form).ok, false);
  form.delete("passwordConfirmation");
  assert.equal(parseAccessPasswordForm(form).ok, false);
});

test("recovery email rejects duplicates and File objects", () => {
  const form = new FormData();
  form.append("email", "client@example.com");
  assert.equal(readSingleStringFormValue(form, "email"), "client@example.com");
  form.append("email", "other@example.com");
  assert.equal(readSingleStringFormValue(form, "email"), null);
  form.set("email", new File(["x"], "upload.txt"));
  assert.equal(readSingleStringFormValue(form, "email"), null);
});
