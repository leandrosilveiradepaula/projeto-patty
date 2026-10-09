import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const recovery = readFileSync(new URL("../../app/recuperar-senha/actions.ts", import.meta.url), "utf8");
const validation = readFileSync(new URL("../../lib/onboarding/validation.ts", import.meta.url), "utf8");

test("password recovery uses trusted origin instead of request host headers", () => {
  assert.match(recovery, /resolveTrustedClientAccessOrigin\(\)/);
  assert.match(recovery, /new URL\("\/redefinir-senha", origin\)\.toString\(\)/);
  assert.doesNotMatch(recovery, /x-forwarded-host|x-forwarded-proto|headers\(\)/);
});

test("password recovery refuses to request a token without a configured trusted origin", () => {
  assert.ok(recovery.indexOf("resolveTrustedClientAccessOrigin()") < recovery.indexOf("resetPasswordForEmail(email"));
  assert.match(recovery, /instanceof ClientAccessLinkOriginError/);
});

test("password recovery validates email length and type", () => {
  assert.match(recovery, /email\.length > 254/);
  assert.match(recovery, /rawEmail !== null && typeof rawEmail !== "string"/);
});

test("new invitations reject excessively long authentication email addresses", () => {
  assert.match(validation, /email\.length > 254/);
});

test("activation and password reset share a bounded password validator", () => {
  assert.match(validation, /password\.length > 128/);
  assert.match(validation, /password\.length < 8/);
});
