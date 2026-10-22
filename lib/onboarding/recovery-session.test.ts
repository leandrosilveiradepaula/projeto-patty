import assert from "node:assert/strict";
import test from "node:test";

import { hasVerifiedRecoverySession } from "./recovery-session.ts";

const baseClaims = {
  session_id: "synthetic-session",
  sub: "synthetic-user",
};

test("accepts the signed claim shapes GoTrue emits for recovery", () => {
  assert.equal(
    hasVerifiedRecoverySession({
      ...baseClaims,
      amr: [{ method: "recovery", timestamp: 1 }],
    }),
    true,
  );
  assert.equal(
    hasVerifiedRecoverySession({
      ...baseClaims,
      amr: [{ method: "otp", timestamp: 1 }],
    }),
    true,
  );
});

test("does not treat an ordinary authenticated session as password recovery", () => {
  assert.equal(
    hasVerifiedRecoverySession({
      ...baseClaims,
      amr: [{ method: "password", timestamp: 1 }],
    }),
    false,
  );
});

test("fails closed for missing identity, session binding or recovery method", () => {
  assert.equal(hasVerifiedRecoverySession(null), false);
  assert.equal(hasVerifiedRecoverySession({ amr: [{ method: "recovery" }] }), false);
  assert.equal(hasVerifiedRecoverySession({ ...baseClaims, amr: [] }), false);
  assert.equal(hasVerifiedRecoverySession({ ...baseClaims, amr: "recovery" }), false);
});
