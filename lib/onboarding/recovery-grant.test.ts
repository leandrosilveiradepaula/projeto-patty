import assert from "node:assert/strict";
import test from "node:test";

import {
  createRecoveryGrant,
  getRecoverySessionIdentity,
  RECOVERY_GRANT_TTL_SECONDS,
  verifyRecoveryGrant,
} from "./recovery-grant.ts";

const key = "local-synthetic-high-entropy-test-signing-key-for-recovery-only";
const otherKey = "unrelated-local-synthetic-high-entropy-test-signing-key";
const claims = { sub: "client-a", session_id: "recovery-session-a" };
const now = 1800000000;

test("recovery grant expires and binds to both Auth user and session", () => {
  const grant = createRecoveryGrant(claims, key, now);
  assert.equal(typeof grant, "string");
  assert.equal(verifyRecoveryGrant(grant, claims, key, now), true);
  assert.equal(verifyRecoveryGrant(grant, claims, key, now + RECOVERY_GRANT_TTL_SECONDS - 1), true);
  assert.equal(verifyRecoveryGrant(grant, claims, key, now + RECOVERY_GRANT_TTL_SECONDS), false);
  assert.equal(verifyRecoveryGrant(grant, { ...claims, session_id: "new-session" }, key, now), false);
  assert.equal(verifyRecoveryGrant(grant, { ...claims, sub: "other-user" }, key, now), false);
});

test("browser cannot fabricate or tamper with a server recovery grant", () => {
  const grant = createRecoveryGrant(claims, key, now)!;
  const [body, mac] = grant.split(".");
  assert.equal(verifyRecoveryGrant(grant, claims, otherKey, now), false);
  assert.equal(verifyRecoveryGrant(body + "." + mac.slice(0, -1) + "A", claims, key, now), false);
  assert.equal(verifyRecoveryGrant(body + ".fake", claims, key, now), false);
  assert.equal(verifyRecoveryGrant("otp", claims, key, now), false);
  assert.equal(verifyRecoveryGrant(undefined, claims, key, now), false);
  assert.equal(verifyRecoveryGrant(grant, claims, key, now - 1), false);
  const decoded = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  decoded.sub = "other-user";
  assert.equal(verifyRecoveryGrant(
    Buffer.from(JSON.stringify(decoded)).toString("base64url") + "." + mac,
    { ...claims, sub: "other-user" }, key, now,
  ), false);
});

test("missing identity, weak keys and oversized cookies fail closed", () => {
  assert.equal(getRecoverySessionIdentity({ sub: "a" }), null);
  assert.equal(getRecoverySessionIdentity({ session_id: "b" }), null);
  assert.equal(getRecoverySessionIdentity({ sub: "a", session_id: "b" })?.sessionId, "b");
  assert.equal(createRecoveryGrant(null, key, now), null);
  assert.equal(verifyRecoveryGrant("x".repeat(1201), claims, key, now), false);
  assert.throws(() => createRecoveryGrant(claims, "too-short", now));
});
