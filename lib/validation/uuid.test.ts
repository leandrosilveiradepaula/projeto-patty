import assert from "node:assert/strict";
import test from "node:test";

import { isUuid } from "./uuid.ts";

test("accepts canonical UUID values used by persisted entities", () => {
  assert.equal(isUuid("550e8400-e29b-41d4-a716-446655440000"), true);
  assert.equal(isUuid("550E8400-E29B-41D4-A716-446655440000"), true);
});

test("rejects malformed identifiers before database lookup", () => {
  for (const value of [
    "",
    "not-a-uuid",
    "550e8400e29b41d4a716446655440000",
    "550e8400-e29b-71d4-a716-446655440000",
    "550e8400-e29b-41d4-z716-446655440000",
  ]) {
    assert.equal(isUuid(value), false);
  }
});
