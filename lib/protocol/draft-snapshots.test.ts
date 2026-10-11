import assert from "node:assert/strict";
import test from "node:test";

import {
  parseOriginalDraftLabel,
  parseOriginalDraftDoseQuantity,
  parseOriginalDraftDoseType,
  parseOriginalDraftPosition,
  parseOriginalDraftId,
  parseOriginalVariantKey,
  serializeOriginalDraftLabel,
} from "./draft-snapshots.ts";

test("nullable labels survive round-trip without conflating null and empty text", () => {
  for (const label of [null, "", "Dia 1", "Café da manhã", "\"teste\""]) {
    assert.deepEqual(parseOriginalDraftLabel(serializeOriginalDraftLabel(label)), { valid: true, value: label });
  }
});

test("untrusted original labels reject missing, malformed, objects and oversized snapshots", () => {
  for (const raw of [null, "undefined", "{", "12", "false", "{}", "[]", " ".repeat(10001)]) {
    assert.deepEqual(parseOriginalDraftLabel(raw), { valid: false });
  }
});

test("original dose parser accepts persisted numeric scale, not exponent or locale coercion", () => {
  for (const [raw, expected] of [["0.0001", 0.0001], ["2", 2], ["999", 999], ["1000.2500", 1000.25], ["99999999.9999", 99_999_999.9999]] as const) {
    assert.equal(parseOriginalDraftDoseQuantity(raw), expected);
  }
  for (const raw of [null, "", "0", "-1", "1e2", "0x10", "1,2", "1.00001", "999999999", "Infinity", " 2 ", "1."]) {
    assert.equal(parseOriginalDraftDoseQuantity(raw), null);
  }
});

test("original order, dose type and identities are validated as technical fields", () => {
  assert.equal(parseOriginalDraftPosition("1"), 1);
  assert.equal(parseOriginalDraftPosition("2147483647"), 2147483647);
  for (const raw of [null, "0", "-1", "1.5", "1e3", "2147483648"]) {
    assert.equal(parseOriginalDraftPosition(raw), null);
  }
  assert.equal(parseOriginalDraftDoseType("protein"), "protein");
  assert.equal(parseOriginalDraftDoseType("fat"), "fat");
  assert.equal(parseOriginalDraftDoseType("carbohydrate"), "carbohydrate");
  assert.equal(parseOriginalDraftDoseType("other"), null);
  const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  assert.equal(parseOriginalDraftId(id), id);
  assert.equal(parseOriginalDraftId("1"), null);
  assert.equal(parseOriginalVariantKey("draft-opaque"), "draft-opaque");
  assert.equal(parseOriginalVariantKey(""), null);
});
