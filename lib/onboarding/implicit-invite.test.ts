import assert from "node:assert/strict";
import test from "node:test";

import { parseImplicitInviteFragment } from "./implicit-invite.ts";

test("parses a Supabase implicit invite fragment", () => {
  assert.deepEqual(
    parseImplicitInviteFragment(
      "#access_token=access-value&refresh_token=refresh-value&type=invite",
    ),
    {
      accessToken: "access-value",
      kind: "invite",
      refreshToken: "refresh-value",
    },
  );
});

test("ignores unrelated auth fragments", () => {
  assert.deepEqual(
    parseImplicitInviteFragment(
      "#access_token=access-value&refresh_token=refresh-value&type=recovery",
    ),
    { kind: "none" },
  );
});

test("rejects incomplete invite fragments", () => {
  assert.deepEqual(
    parseImplicitInviteFragment("#access_token=access-value&type=invite"),
    { kind: "invalid" },
  );
});
