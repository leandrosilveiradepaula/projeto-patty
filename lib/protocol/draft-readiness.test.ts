import assert from "node:assert/strict";
import test from "node:test";

import {
  formatProtocolDraftReadiness,
  getProtocolDraftReadiness,
} from "./draft-readiness.ts";

test("draft is not ready without a meal plan", () => {
  const result = getProtocolDraftReadiness(null);
  assert.equal(result.ready, false);
  assert.deepEqual(result.reasons, ["missing_plan"]);
});

test("draft is not ready without variants", () => {
  const result = getProtocolDraftReadiness({ variants: [] });
  assert.equal(result.ready, false);
  assert.deepEqual(result.reasons, ["missing_variant"]);
});

test("draft is not ready when a variant has no meals", () => {
  const result = getProtocolDraftReadiness({
    variants: [{ meals: [] }],
  });
  assert.equal(result.ready, false);
  assert.deepEqual(result.reasons, ["variant_without_meal"]);
});

test("draft is not ready when a meal has no dose", () => {
  const result = getProtocolDraftReadiness({
    variants: [{ meals: [{ doseAllocations: [] }] }],
  });
  assert.equal(result.ready, false);
  assert.deepEqual(result.reasons, ["meal_without_dose"]);
});

test("draft is ready with at least one dose in every meal", () => {
  const result = getProtocolDraftReadiness({
    variants: [
      {
        meals: [
          { doseAllocations: [{}] },
          { doseAllocations: [{}, {}] },
        ],
      },
    ],
  });

  assert.equal(result.ready, true);
  assert.deepEqual(result.reasons, []);
  assert.equal(
    formatProtocolDraftReadiness(result.reasons),
    "A estrutura alimentar mínima está registrada.",
  );
});

test("cycle remains optional when no cycle exists", () => {
  const plan = { variants: [{ meals: [{ doseAllocations: [{}] }] }], cycles: [] };
  assert.deepEqual(getProtocolDraftReadiness(plan), { ready: true, reasons: [] });
});

test("created empty cycle blocks review without imposing a fixed sequence", () => {
  const plan = {
    variants: [{ meals: [{ doseAllocations: [{}] }] }],
    cycles: [{ steps: [] }],
  };
  const result = getProtocolDraftReadiness(plan);
  assert.deepEqual(result, { ready: false, reasons: ["cycle_without_step"] });
  assert.match(formatProtocolDraftReadiness(result.reasons), /ciclos vazios/);
});

test("manually composed single or repeated cycle steps can be reviewed", () => {
  const variants = [{ meals: [{ doseAllocations: [{}] }] }];
  for (const steps of [[{}], [{}, {}, {}]]) {
    assert.equal(getProtocolDraftReadiness({ variants, cycles: [{ steps }] }).ready, true);
  }
});
