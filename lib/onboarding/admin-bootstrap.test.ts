import assert from "node:assert/strict";
import test from "node:test";

import {
  assertAdminBootstrapRoleCount,
  assertSoleAdminBootstrapTransition,
  resolveAdminBootstrapState,
} from "./admin-bootstrap.ts";

test("bootstrap creates admin role only for an unlinked profile without roles", () => {
  assert.equal(
    resolveAdminBootstrapState({ clientLinked: false, roles: [] }),
    "create_admin_role",
  );
});

test("bootstrap is idempotent for an existing admin", () => {
  assert.equal(
    resolveAdminBootstrapState({ clientLinked: false, roles: ["admin"] }),
    "already_admin",
  );
});

test("bootstrap refuses promotion of a client-linked profile", () => {
  assert.throws(
    () => resolveAdminBootstrapState({ clientLinked: true, roles: [] }),
    /linked as client/,
  );
});

test("bootstrap refuses existing client or ambiguous roles", () => {
  assert.throws(
    () => resolveAdminBootstrapState({ clientLinked: false, roles: ["client"] }),
    /non-admin or ambiguous/,
  );
  assert.throws(
    () =>
      resolveAdminBootstrapState({
        clientLinked: false,
        roles: ["admin", "client"],
      }),
    /non-admin or ambiguous/,
  );
});

test("bootstrap accepts initial provision only when no admin role exists", () => {
  assert.doesNotThrow(() => assertAdminBootstrapRoleCount(0));
  assert.doesNotThrow(() => assertSoleAdminBootstrapTransition({
    existingAdminCount: 0, targetState: "create_admin_role",
  }));
});

test("bootstrap only verifies an existing sole admin idempotently", () => {
  assert.doesNotThrow(() => assertAdminBootstrapRoleCount(1));
  assert.doesNotThrow(() => assertSoleAdminBootstrapTransition({
    existingAdminCount: 1, targetState: "already_admin",
  }));
  assert.throws(() => assertSoleAdminBootstrapTransition({
    existingAdminCount: 1, targetState: "create_admin_role",
  }), /second administrator/);
});

test("bootstrap fails closed when hosted roles are multiple or unknown", () => {
  for (const count of [2, 3]) {
    assert.throws(() => assertAdminBootstrapRoleCount(count), /multiple admin roles/);
    for (const targetState of ["already_admin", "create_admin_role"] as const) {
      assert.throws(() => assertSoleAdminBootstrapTransition({
        existingAdminCount: count, targetState,
      }), /multiple admin roles/);
    }
  }
  for (const count of [-1, 1.2, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(() => assertAdminBootstrapRoleCount(count), /cannot verify/);
  }
});

test("bootstrap rejects an internally inconsistent count before any write", () => {
  assert.throws(() => assertSoleAdminBootstrapTransition({
    existingAdminCount: 0, targetState: "already_admin",
  }), /inconsistent/);
});
