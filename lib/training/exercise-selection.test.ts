import assert from "node:assert/strict";
import test from "node:test";
import { isHistoricalExerciseSelectionUnavailable, orderPublishedExerciseOptions, filterPublishedExerciseOptions, selectedExerciseOption, readExerciseSelectionQuery } from "./exercise-selection.ts";

const options = [
  { id: "remada-v1", name: "Remada", versionNumber: 1 },
  { id: "agachamento-v1", name: "Agachamento", versionNumber: 1 },
  { id: "agachamento-v3", name: "Agachamento", versionNumber: 3 },
];

test("catalogue list sorts names alphabetically and versions most recent first", () => {
  const sorted = orderPublishedExerciseOptions(options);
  assert.deepEqual(sorted.map(x => x.id), ["agachamento-v3", "agachamento-v1", "remada-v1"]);
  assert.deepEqual(options.map(x => x.id), ["remada-v1", "agachamento-v1", "agachamento-v3"]);
});

test("a historical linked version that disappeared cannot silently become manual", () => {
  assert.equal(isHistoricalExerciseSelectionUnavailable("removed-v2", "removed-v2", options), true);
  assert.equal(isHistoricalExerciseSelectionUnavailable("removed-v2", "", options), false);
  assert.equal(isHistoricalExerciseSelectionUnavailable("removed-v2", "remada-v1", options), false);
  assert.equal(isHistoricalExerciseSelectionUnavailable("remada-v1", "remada-v1", options), false);
  assert.equal(isHistoricalExerciseSelectionUnavailable(null, "", options), false);
});

test("same-name same-version options tie-break deterministically by UUID", () => {
  const rows = [
    { id:"b",name:"Ombro",versionNumber:2 },
    { id:"a",name:"Ombro",versionNumber:2 },
  ];
  assert.deepEqual(orderPublishedExerciseOptions(rows).map(x=>x.id),["a","b"]);
});

test("published catalog query ignores accents without mutating the source or selecting a different version", () => {
  const catalog = [
    { id: "v1", name: "Elevação Lateral", versionNumber: 1 },
    { id: "v2", name: "Elevação Lateral", versionNumber: 2 },
    { id: "v3", name: "Remada", versionNumber: 1 },
  ];
  assert.deepEqual(filterPublishedExerciseOptions(catalog, "elevacao").map(x => x.id), ["v2", "v1"]);
  assert.equal(selectedExerciseOption(catalog, "v1")?.id, "v1");
  assert.equal(selectedExerciseOption(catalog, "missing"), null);
  assert.equal(catalog[0].id, "v1");
  assert.deepEqual(filterPublishedExerciseOptions(catalog, null).map(x => x.id), ["v2", "v1", "v3"]);
});
test("query is normalized to a bounded string, regardless of untrusted input", () => {
  assert.equal(readExerciseSelectionQuery({ query: "Remada" }), "");
  assert.equal(readExerciseSelectionQuery("  Remada  "), "Remada");
  assert.equal(readExerciseSelectionQuery("x".repeat(300)).length, 120);
});
