import assert from "node:assert/strict";
import test from "node:test";
import { formatFactualAssessmentDate, formatFactualMeasurement, formatFactualDelta } from "./progress-format.ts";

test("progress dates do not crash on invalid legacy values", () => {
  assert.equal(formatFactualAssessmentDate("invalid"), "Data indisponível");
  assert.equal(formatFactualAssessmentDate(""), "Data indisponível");
  assert.match(formatFactualAssessmentDate("2026-10-11T12:00:00Z"), /11\/10\/2026/);
});

test("deltas distinguish the absence of a comparison from a real zero", () => {
  assert.equal(formatFactualDelta(null, "kg"), "Sem comparação anterior");
  assert.equal(formatFactualDelta(0, "kg"), "0 kg");
  assert.equal(formatFactualDelta(-0, "kg"), "0 kg");
  assert.equal(formatFactualDelta(1.5, "kg"), "+1,5 kg");
  assert.equal(formatFactualDelta(-2.25, "cm"), "-2,25 cm");
  assert.equal(formatFactualDelta(Number.POSITIVE_INFINITY, "kg"), "Sem comparação anterior");
  assert.equal(formatFactualMeasurement(Number.NaN), "Valor indisponível");
});

test("numeric values remain factual; no improvement or success classification", () => {
  for (const n of [0, 2, -2]) assert.doesNotMatch(formatFactualDelta(n, "cm"), /melhora|piora|meta|sucesso/i);
});
