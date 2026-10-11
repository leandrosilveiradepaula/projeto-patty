import assert from "node:assert/strict";
import test from "node:test";

import {
  applyDraftCycleOperation,
  parseDraftCycleSteps,
  sameDraftCycleSteps,
  serializeDraftCycleSteps,
} from "./cycle-editor.ts";

const a = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const b = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const c = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const steps = [
  { position: 1, variantId: a },
  { position: 2, variantId: b },
];

function change(operation: "add" | "replace" | "move_up" | "move_down" | "remove",
  position: number | null, variantId: string | null = null) {
  return applyDraftCycleOperation({
    steps,
    operation,
    position,
    variantId,
    allowedVariantIds: [a, b, c],
  });
}

test("cycle snapshot round-trip keeps exact persisted positions and variants", () => {
  const snapshot = serializeDraftCycleSteps(steps);
  assert.deepEqual(parseDraftCycleSteps(snapshot), steps);
  assert.equal(sameDraftCycleSteps(steps, parseDraftCycleSteps(snapshot)!), true);
  assert.equal(sameDraftCycleSteps(steps, [{ position: 1, variantId: b }, steps[1]]), false);
  assert.equal(sameDraftCycleSteps(steps, steps.slice(0, 1)), false);
});

test("cycle snapshots reject invalid, duplicate, reversed or oversized input", () => {
  const invalid = [
    null, "", "null", "{}", "[null]", "[3]", "[{}]", "no json",
    JSON.stringify([{ position: 0, variantId: a }]),
    JSON.stringify([{ position: -1, variantId: a }]),
    JSON.stringify([{ position: 1.1, variantId: a }]),
    JSON.stringify([{ position: 2_147_483_648, variantId: a }]),
    JSON.stringify([{ position: 1, variantId: "not-uuid" }]),
    JSON.stringify([{ position: 2, variantId: a }, { position: 1, variantId: b }]),
    JSON.stringify([{ position: 1, variantId: a }, { position: 1, variantId: b }]),
    " ".repeat(200_001),
  ];
  for (const value of invalid) assert.equal(parseDraftCycleSteps(value), null);
  assert.deepEqual(parseDraftCycleSteps("[]"), []);
  assert.deepEqual(parseDraftCycleSteps(JSON.stringify([{ position: 1, variantId: a }, { position: 7, variantId: b }])), [
    { position: 1, variantId: a },
    { position: 7, variantId: b },
  ]);
});

test("manually appends and changes steps with only versions from the same plan", () => {
  assert.deepEqual(change("add", null, a), [a, b, a]);
  assert.deepEqual(change("replace", 2, c), [a, c]);
  assert.equal(change("add", null, "dddddddd-dddd-4ddd-8ddd-dddddddddddd"), null);
  assert.equal(change("replace", 2, "dddddddd-dddd-4ddd-8ddd-dddddddddddd"), null);
  assert.equal(change("replace", 2, b), null);
  assert.equal(change("replace", 9, a), null);
});

test("moving and removing steps preserves explicit order without nutritional defaults", () => {
  assert.deepEqual(change("move_up", 2), [b, a]);
  assert.deepEqual(change("move_down", 1), [b, a]);
  assert.deepEqual(change("remove", 1), [b]);
  assert.deepEqual(change("remove", 2), [a]);
  assert.equal(change("move_up", 1), null);
  assert.equal(change("move_down", 2), null);
  assert.equal(change("remove", 8), null);
  assert.deepEqual(applyDraftCycleOperation({
    steps: [{ position: 3, variantId: a }], operation: "remove",
    position: 3, variantId: null, allowedVariantIds: [a],
  }), []);
});
