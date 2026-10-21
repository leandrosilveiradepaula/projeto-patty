import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const setup = readFileSync(
  new URL("../../components/auth/AdminMfaSetup.tsx", import.meta.url),
  "utf8",
);
const helper = readFileSync(
  new URL("../onboarding/admin-mfa-enrollment.ts", import.meta.url),
  "utf8",
);

test("admin MFA reload inspects factors but never mutates enrollment on mount", () => {
  const effectIndex = setup.indexOf("  useEffect(() => {");
  const clickHandlerIndex = setup.indexOf("  async function beginEnrollment()");
  assert.ok(effectIndex >= 0 && clickHandlerIndex > effectIndex);
  const effect = setup.slice(effectIndex, clickHandlerIndex);
  assert.match(effect, /mfa\.listFactors\(\)/);
  assert.match(effect, /decideAdminMfaEnrollment\(factors\.data\.all\)/);
  assert.doesNotMatch(effect, /mfa\.(?:enroll|unenroll)\(/);
});

test("pending-factor removal is gated by an explicit button, exact user factor, and fresh checks", () => {
  const handlerIndex = setup.indexOf("  async function beginEnrollment()");
  const verifyIndex = setup.indexOf("  async function verifyEnrollment(");
  assert.ok(handlerIndex >= 0 && verifyIndex > handlerIndex);
  const handler = setup.slice(handlerIndex, verifyIndex);
  assert.match(handler, /setupKind !== "new" && setupKind !== "reset_pending"/);
  assert.match(handler, /if \(decision\.kind === "blocked"\)/);
  assert.match(handler, /if \(decision\.kind === "challenge"\)/);
  assert.match(handler, /if \(decision\.kind === "reset_pending"\)/);
  assert.match(handler, /factorId: decision\.factorId/);
  assert.match(handler, /mfa\.unenroll\(/);
  assert.match(handler, /decideAdminMfaEnrollment\(afterRemoval\.data\.all\)/);
  assert.match(handler, /if \(afterDecision\.kind !== "new"\)/);
  assert.match(handler, /mfa\.enroll\(/);
  assert.ok(handler.indexOf("mfa.unenroll(") < handler.indexOf("mfa.enroll("));
  assert.match(setup, /onClick=\{\(\) => \{ void beginEnrollment\(\); \}\}/);
  assert.match(setup, /Descartar configuração pendente e gerar nova chave/);
});

test("verified factors, other types, and other friendly names cannot be unenrolled", () => {
  assert.match(helper, /factor\.status === "verified"/);
  assert.match(helper, /factor\.status === "unverified"/);
  assert.match(helper, /factor\.friendly_name === ADMIN_MFA_FRIENDLY_NAME/);
  assert.match(helper, /factors\.length !== pending\.length/);
  assert.doesNotMatch(setup, /createAdminClient|SUPABASE_SECRET_KEY|service_role/);
  assert.doesNotMatch(setup, /console\.(?:log|error)|localStorage/);
});
