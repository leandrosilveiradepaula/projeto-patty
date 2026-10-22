import assert from "node:assert/strict";
import test from "node:test";

import { hasVerifiedRecoverySession } from "./recovery-session.ts";

const baseClaims = {
  session_id: "synthetic-session",
  sub: "synthetic-user",
};

test("only signed PKCE recovery AMR is specific to a recovery exchange", () => {
  assert.equal(hasVerifiedRecoverySession({
    ...baseClaims,
    amr: [{ method: "recovery", timestamp: 1 }],
  }), true);
});

test("ordinary password AND OTP / magic-link logins cannot authorize recovery", () => {
  assert.equal(hasVerifiedRecoverySession({
    ...baseClaims,
    amr: [{ method: "password", timestamp: 1 }],
  }), false);
  assert.equal(hasVerifiedRecoverySession({
    ...baseClaims,
    amr: [{ method: "otp", timestamp: 1 }],
  }), false);
});

test("fails closed for missing identity, session or verified recovery method", () => {
  assert.equal(hasVerifiedRecoverySession(null), false);
  assert.equal(hasVerifiedRecoverySession({ amr: [{ method: "recovery" }] }), false);
  assert.equal(hasVerifiedRecoverySession({ ...baseClaims, amr: [] }), false);
  assert.equal(hasVerifiedRecoverySession({ ...baseClaims, amr: "recovery" }), false);
  assert.equal(hasVerifiedRecoverySession({ ...baseClaims, amr: [{ method: "otp" }] }), false);
});
