import assert from "node:assert/strict";
import test from "node:test";

import { resolveAdminBootstrapState } from "./admin-bootstrap.ts";

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
