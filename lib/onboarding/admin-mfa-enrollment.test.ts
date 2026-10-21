import assert from "node:assert/strict";
import test from "node:test";

import {
  ADMIN_MFA_FRIENDLY_NAME,
  decideAdminMfaEnrollment,
  type AdminMfaFactor,
} from "./admin-mfa-enrollment.ts";

function factor(
  id: string,
  status: string,
  overrides: Partial<AdminMfaFactor> = {},
): AdminMfaFactor {
  return {
    id,
    factor_type: "totp",
    friendly_name: ADMIN_MFA_FRIENDLY_NAME,
    status,
    ...overrides,
  };
}

test("a fresh MFA setup is allowed only when no factors exist", () => {
  assert.deepEqual(decideAdminMfaEnrollment([]), { kind: "new" });
});

test("one unverified enrollment must be explicitly discarded by exact factor ID", () => {
  assert.deepEqual(decideAdminMfaEnrollment([factor("pending-1", "unverified")]), {
    kind: "reset_pending",
    factorId: "pending-1",
  });
});

test("verified TOTP always wins over an old pending enrollment", () => {
  assert.deepEqual(decideAdminMfaEnrollment([
    factor("old-pending", "unverified"),
    factor("existing-verified", "verified"),
  ]), { kind: "challenge" });
  assert.deepEqual(decideAdminMfaEnrollment([
    factor("verified", "verified", { friendly_name: "Another device" }),
  ]), { kind: "challenge" });
});

test("multiple pending MFA enrollments are ambiguous and must fail closed", () => {
  assert.deepEqual(decideAdminMfaEnrollment([
    factor("pending-1", "unverified"),
    factor("pending-2", "unverified"),
  ]), { kind: "blocked" });
});

test("other-factor enrollment cannot be removed through this flow", () => {
  const others: AdminMfaFactor[] = [
    factor("unrelated", "unverified", { friendly_name: "Another authenticator" }),
    factor("phone", "verified", { factor_type: "phone" }),
    factor("unknown", "unverified", { factor_type: "webauthn" }),
    factor("no-name", "unverified", { friendly_name: null }),
    factor("unknown-status", "pending"),
  ];
  for (const other of others) {
    assert.deepEqual(decideAdminMfaEnrollment([other]), { kind: "blocked" });
    assert.deepEqual(
      decideAdminMfaEnrollment([factor("pending-own", "unverified"), other]),
      { kind: "blocked" },
    );
  }
});

test("adding a verified TOTP routes to challenge even if unrelated factors exist", () => {
  assert.deepEqual(decideAdminMfaEnrollment([
    factor("active", "verified"),
    factor("other-unverified", "unverified", { friendly_name: "Other" }),
  ]), { kind: "challenge" });
});
