import assert from "node:assert/strict";
import test from "node:test";

import {
  compareWeeklyFeedbackDrafts,
  reconcileWeeklyFeedbackDrafts,
} from "./draft-reconciliation.ts";

const keys = ["q01", "q02", "q03"] as const;
const baseline = { q01: "2", q02: "", q03: "Notas anteriores" };

test("adopts untouched server fields while preserving only local edits", () => {
  const mine = { ...baseline, q02: "3" };
  const server = { ...baseline, q01: "4" };
  assert.deepEqual(compareWeeklyFeedbackDrafts(keys, baseline, mine, server), [
    { key: "q01", mineChanged: false, savedChanged: true, collision: false },
    { key: "q02", mineChanged: true, savedChanged: false, collision: false },
  ]);
  assert.deepEqual(reconcileWeeklyFeedbackDrafts(keys, baseline, mine, server, {}), {
    q01: "4", q02: "3", q03: "Notas anteriores",
  });
  assert.equal(baseline.q01, "2");
  assert.equal(mine.q01, "2");
  assert.equal(server.q02, "");
});

test("overlapping health answer requires explicit decision before any reconciliation", () => {
  const mine = { ...baseline, q01: "5", q02: "3" };
  const server = { ...baseline, q01: "4", q03: "Nota remota" };
  const diffs = compareWeeklyFeedbackDrafts(keys, baseline, mine, server);
  assert.deepEqual(diffs.filter(row => row.collision).map(row => row.key), ["q01"]);
  assert.equal(reconcileWeeklyFeedbackDrafts(keys, baseline, mine, server, {}), null);
  assert.deepEqual(reconcileWeeklyFeedbackDrafts(keys, baseline, mine, server, { q01: "mine" }), {
    q01: "5", q02: "3", q03: "Nota remota",
  });
  assert.deepEqual(reconcileWeeklyFeedbackDrafts(keys, baseline, mine, server, { q01: "saved" }), {
    q01: "4", q02: "3", q03: "Nota remota",
  });
});

test("convergent same-field changes do not require a choice", () => {
  const mine = { ...baseline, q01: "4" };
  const server = { ...baseline, q01: "4" };
  assert.equal(compareWeeklyFeedbackDrafts(keys, baseline, mine, server)[0].collision, false);
  assert.equal(reconcileWeeklyFeedbackDrafts(keys, baseline, mine, server, {})?.q01, "4");
});

test("blanking a health answer is a change and never silently restores the other answer", () => {
  const mine = { ...baseline, q03: "" };
  const server = { ...baseline, q03: "Outra resposta salva" };
  assert.equal(reconcileWeeklyFeedbackDrafts(keys, baseline, mine, server, {}), null);
  assert.equal(reconcileWeeklyFeedbackDrafts(keys, baseline, mine, server, { q03: "mine" })?.q03, "");
  assert.equal(reconcileWeeklyFeedbackDrafts(keys, baseline, mine, server, { q03: "saved" })?.q03, "Outra resposta salva");
});

test("handles empty client answers without manufacturing values or mutating inputs", () => {
  const frozen = Object.freeze({ q01: "", q02: "", q03: "" });
  const server = Object.freeze({ q01: "0", q02: "", q03: "" });
  const result = reconcileWeeklyFeedbackDrafts(keys, frozen, frozen, server, {});
  assert.deepEqual(result, server);
  assert.notEqual(result, server);
});

test("question keys only are projected; extra untrusted fields cannot enter the merged draft", () => {
  const server = { ...baseline, q02: "1", privateOtherField: "ignored" };
  assert.deepEqual(Object.keys(reconcileWeeklyFeedbackDrafts(keys, baseline, baseline, server, {}) ?? {}), [...keys]);
});
