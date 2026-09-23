import assert from "node:assert/strict";
import test from "node:test";

import {
  getDraftAnswerWriteMode,
  getDraftCreationMode,
  isUniqueViolationCode,
} from "./draft-policy.ts";

test("reuses an existing active draft instead of creating a second one", () => {
  assert.equal(
    getDraftCreationMode("550e8400-e29b-41d4-a716-446655440000"),
    "reuse",
  );
});

test("creates a draft only when none exists", () => {
  assert.equal(getDraftCreationMode(null), "create");
});

test("updates an existing answer and inserts a missing answer", () => {
  assert.equal(
    getDraftAnswerWriteMode("550e8400-e29b-41d4-a716-446655440000"),
    "update",
  );
  assert.equal(getDraftAnswerWriteMode(null), "insert");
});

test("recognizes the PostgreSQL unique violation used for race recovery", () => {
  assert.equal(isUniqueViolationCode("23505"), true);
  assert.equal(isUniqueViolationCode("42501"), false);
  assert.equal(isUniqueViolationCode(undefined), false);
});
