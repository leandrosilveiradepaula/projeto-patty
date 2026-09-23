import assert from "node:assert/strict";
import test from "node:test";

import {
  parseCorrectionJson,
  serializeCorrectionJson,
} from "./corrections.ts";

test("parseCorrectionJson accepts every JSON top-level shape", () => {
  const cases = [
    ['"texto"', "texto"],
    ["42", 42],
    ["true", true],
    ["null", null],
    ['["a","b"]', ["a", "b"]],
    ['{"value":"x"}', { value: "x" }],
  ];

  for (const [raw, expected] of cases) {
    const result = parseCorrectionJson(raw);

    assert.equal(result.ok, true);
    if (result.ok) {
      assert.deepEqual(result.value, expected);
    }
  }
});

test("parseCorrectionJson rejects blank and invalid input", () => {
  assert.equal(parseCorrectionJson("   ").ok, false);
  assert.equal(parseCorrectionJson("texto sem aspas").ok, false);
  assert.equal(parseCorrectionJson("{").ok, false);
});

test("serializeCorrectionJson produces parseable JSON", () => {
  const source = { nested: ["a", 2, true] };
  const serialized = serializeCorrectionJson(source);
  const parsed = parseCorrectionJson(serialized);

  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.deepEqual(parsed.value, source);
  }
});
