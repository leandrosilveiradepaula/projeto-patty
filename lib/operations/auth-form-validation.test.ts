import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (p: string) => readFileSync(new URL("../../" + p, import.meta.url), "utf8");
const login = read("app/login/actions.ts");
const recovery = read("app/recuperar-senha/actions.ts");
const invitations = read("app/admin/clientes/nova/actions.ts");

test("login validates email using the shared onboarding validator", () => {
  assert.match(login, /!validateInvitationEmail\(email\)\.ok/);
  assert.ok(login.indexOf("validateInvitationEmail(email)") < login.indexOf("signInWithPassword"));
});

test("login bounds password length before authentication", () => {
  assert.match(login, /password\.length > 128/);
});

test("password recovery shares invitation email validation", () => {
  assert.match(recovery, /!validateInvitationEmail\(email\)\.ok/);
});

test("both invitation flows reject non-text client names", () => {
  assert.equal(invitations.split('displayNameValue !== null && typeof displayNameValue !== "string"').length - 1, 2);
});

test("both invitation flows reject non-text login emails", () => {
  assert.equal(invitations.split('emailValue !== null && typeof emailValue !== "string"').length - 1, 2);
});
