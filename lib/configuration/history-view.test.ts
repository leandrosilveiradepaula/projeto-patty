import assert from "node:assert/strict";
import test from "node:test";
import {
  canonicalConfiguration,
  configurationsEqual,
  formatConfigurationDate,
  formatConfigurationPath,
  listConfigurationChanges,
  summarizeConfigurationHistory,
} from "./history-view.ts";

test("semantically equal JSON objects compare regardless of storage key order", () => {
  const a = { a: { b: 1, c: [1, { y: 2, x: 3 }] }, z: null };
  const b = { z: null, a: { c: [1, { x: 3, y: 2 }], b: 1 } };
  assert.equal(configurationsEqual(a, b), true);
  assert.equal(canonicalConfiguration(a), canonicalConfiguration(b));
  assert.equal(configurationsEqual(a, { z: null, a: { b: 2, c: [1, { y: 2, x: 3 }] } }), false);
  assert.equal(configurationsEqual([1, 2], [2, 1]), false);
});

test("diffs include additions, removals, changed values, and unchanged paths disappear", () => {
  const changes = listConfigurationChanges(
    { first: { value: 12, unit: "g" }, old: 1, preserved: { a: true } },
    { first: { unit: "g", value: 14 }, latest: 2, preserved: { a: true } },
  );
  assert.deepEqual(changes, [
    { path: "first.value", kind: "alterado", previous: "12", current: "14" },
    { path: "latest", kind: "adicionado", previous: "—", current: "2" },
    { path: "old", kind: "removido", previous: "1", current: "—" },
  ]);
  assert.deepEqual(listConfigurationChanges({ value: 1 }, { value: 1 }), []);
});

test("nested formulas are treated as data and never evaluated", () => {
  const a = { outputs: { target: { expression: { op: "multiply", args: [2, 3] } } } };
  const b = { outputs: { target: { expression: { op: "multiply", args: [3, 2] } } } };
  const rows = listConfigurationChanges(a, b);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].path, "outputs.target.expression.args");
  assert.equal(rows[0].current, "[3,2]");
});

test("history is ordered by actual version numbers without mutating source", () => {
  const old = { id: "a", version_number: 1, created_at: "2026-10-01", activated_at: "2026-10-01", retired_at: "2026-10-03", configuration: {value:1} };
  const current = { id: "c", version_number: 3, created_at: "2026-10-08", activated_at: "2026-10-08", retired_at: null, configuration: {value:3} };
  const middle = { id: "b", version_number: 2, created_at: "2026-10-03", activated_at: "2026-10-03", retired_at: "2026-10-08", configuration: {value:2} };
  const input = [old,current,middle];
  const rows = summarizeConfigurationHistory(input, current.id);
  assert.deepEqual(rows.map((x)=>[x.version_number,x.previousNumber,x.isActive,x.changeCount]), [
    [3,2,true,1],[2,1,false,1],[1,null,false,0],
  ]);
  assert.equal(input[0].id, "a");
  assert.deepEqual(summarizeConfigurationHistory([], null), []);
});

test("date handling and UI path labels do not crash on invalid legacy data", () => {
  assert.equal(formatConfigurationDate(null), "Data indisponível");
  assert.equal(formatConfigurationDate("legacy"), "Data indisponível");
  assert.match(formatConfigurationDate("2026-10-11T08:00:00Z"), /11\/10\/2026/);
  assert.equal(formatConfigurationPath("request_weekday"), "Dia do Feedback Semanal");
  assert.equal(formatConfigurationPath("unknown_professional_coefficient"), "unknown professional coefficient");
});
