import assert from "node:assert/strict";
import test from "node:test";

import { parseImplicitRecoveryFragment } from "./implicit-recovery.ts";

test("parses a Supabase implicit recovery fragment", () => {
  assert.deepEqual(
    parseImplicitRecoveryFragment(
      "#access_token=access-value&refresh_token=refresh-value&type=recovery",
    ),
    {
      accessToken: "access-value",
      kind: "recovery",
      refreshToken: "refresh-value",
    },
  );
});

test("ignores unrelated auth fragments", () => {
  assert.deepEqual(
    parseImplicitRecoveryFragment(
      "#access_token=access-value&refresh_token=refresh-value&type=invite",
    ),
    { kind: "none" },
  );
});

test("rejects incomplete recovery fragments", () => {
  assert.deepEqual(
    parseImplicitRecoveryFragment("#access_token=access-value&type=recovery"),
    { kind: "invalid" },
  );
});
