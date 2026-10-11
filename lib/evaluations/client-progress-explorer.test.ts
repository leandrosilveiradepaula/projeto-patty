import assert from "node:assert/strict";
import test from "node:test";
import {
  assembleClientFinalizedAssessments,
  factualObservationPlot,
  parseProgressMeasureSelection,
  parseProgressObservationWindow,
  precisionSafeProgressDelta,
  precisionSafeProgressNumber,
  progressionAllHref,
  progressionMeasureHref,
  sliceFactualSeries,
  summarizeFactualSeriesWindow,
} from "./client-progress-explorer.ts";
import { buildFactualProgressSeries } from "./progress-view.ts";

const sample = buildFactualProgressSeries(assembleClientFinalizedAssessments([
  { assessment_id: "a", assessed_at: "2026-07-01", measurement_key: "peso", measurement_value: 70.4321, unit: "kg" },
  { assessment_id: "a", assessed_at: "2026-07-01", measurement_key: "cintura", measurement_value: 85, unit: "cm" },
  { assessment_id: "b", assessed_at: "2026-08-01", measurement_key: "peso", measurement_value: 70.41, unit: "kg" },
  { assessment_id: "c", assessed_at: "2026-09-01", measurement_key: "peso", measurement_value: 70.3, unit: "kg" },
  { assessment_id: "d", assessed_at: "2026-10-01", measurement_key: "peso", measurement_value: 70.2, unit: "kg" },
]));

test("shared assembler preserves all authorized raw rows and assessments, without modifying input", () => {
  const input = [
    { assessment_id: "a", assessed_at: "2026-10-01", measurement_key: "peso", measurement_value: 70, unit: "kg" },
    { assessment_id: "b", assessed_at: "2026-09-01", measurement_key: "peso", measurement_value: 71, unit: "kg" },
    { assessment_id: "a", assessed_at: "2026-10-01", measurement_key: "cintura", measurement_value: 75, unit: "cm" },
  ];
  const result = assembleClientFinalizedAssessments(input);
  assert.equal(result.length, 2);
  assert.deepEqual(result[0].measurements.map((m) => m.measurement_key), ["peso", "cintura"]);
  assert.equal(input.length, 3);
  assert.deepEqual(assembleClientFinalizedAssessments([]), []);
});

test("window and measure filters validate untrusted URL values", () => {
  assert.deepEqual(parseProgressObservationWindow(undefined), { value: "all", invalid: false });
  for (const window of ["all", "3", "6", "12"]) {
    assert.deepEqual(parseProgressObservationWindow(window), { value: window, invalid: false });
  }
  for (const invalid of ["0", "2", "24", ["3"], null, { all: true }]) {
    assert.deepEqual(parseProgressObservationWindow(invalid), { value: "all", invalid: true });
  }
  assert.deepEqual(parseProgressMeasureSelection(undefined, 2), { index: null, invalid: false });
  assert.deepEqual(parseProgressMeasureSelection("all", 2), { index: null, invalid: false });
  assert.deepEqual(parseProgressMeasureSelection("1", 2), { index: 0, invalid: false });
  assert.deepEqual(parseProgressMeasureSelection("2", 2), { index: 1, invalid: false });
  for (const invalid of [null, "0", "3", "01", "-1", "1.5", ["1"], "1e1", "1000000", {}, ""]) {
    assert.deepEqual(parseProgressMeasureSelection(invalid, 2), { index: null, invalid: true });
  }
});

test("window keeps original full history intact and resets the baseline delta", () => {
  const s = sample.find((item) => item.key === "peso");
  assert.ok(s);
  const last3 = sliceFactualSeries(s, "3");
  assert.deepEqual(last3.points.map((point) => point.assessmentId), ["b", "c", "d"]);
  assert.equal(last3.points[0].deltaFromPrevious, null);
  assert.ok(Math.abs((last3.points[1].deltaFromPrevious ?? 0) - (-0.11)) < 1e-9);
  assert.equal(s.points.length, 4);
  assert.ok(s.points[1].deltaFromPrevious !== null);
  assert.deepEqual(sliceFactualSeries(s, "all"), s);
});

test("single observation and window summary are neutral and do not invent progress", () => {
  const one = sample.find((item) => item.key === "cintura");
  assert.ok(one);
  assert.deepEqual(summarizeFactualSeriesWindow(one), {
    first: one.points[0], last: one.points[0], change: null, shown: 1,
  });
  const empty = { ...one, points: [] };
  assert.deepEqual(summarizeFactualSeriesWindow(empty), {
    first: null, last: null, change: null, shown: 0,
  });
  const last = summarizeFactualSeriesWindow(sliceFactualSeries(sample.find((item) => item.key === "peso")!, "3"));
  assert.ok(Math.abs((last.change ?? 0) - (-0.21)) < 1e-9);
});

test("observation geometry handles ties, one point, negative values and extreme overflow", () => {
  assert.deepEqual(factualObservationPlot([]), []);
  assert.deepEqual(factualObservationPlot([{ value: 5 }]), [{ x: 200, y: 60 }]);
  assert.deepEqual(factualObservationPlot([{ value: 5 }, { value: 5 }]), [
    { x: 24, y: 60 }, { x: 376, y: 60 },
  ]);
  assert.deepEqual(factualObservationPlot([{ value: -2 }, { value: -1 }, { value: 2 }]), [
    { x: 24, y: 104 }, { x: 200, y: 82 }, { x: 376, y: 16 },
  ]);
  assert.equal(factualObservationPlot([{ value: -1e308 }, { value: 1e308 }]), null);
  assert.equal(factualObservationPlot([{ value: Number.NaN }]), null);
});

test("precision rendering preserves measured small differences rather than rounding to zero", () => {
  assert.equal(precisionSafeProgressNumber(0.004), "0,004");
  assert.equal(precisionSafeProgressNumber(-0), "0");
  assert.equal(precisionSafeProgressDelta(0.004), "+0,004");
  assert.equal(precisionSafeProgressDelta(-0.2), "-0,2");
  assert.equal(precisionSafeProgressDelta(null), "—");
  assert.equal(precisionSafeProgressDelta(Number.POSITIVE_INFINITY), "—");
});

test("navigation includes only numeric authorized series positions and no measurement key", () => {
  assert.equal(progressionMeasureHref(2, "6"), "/cliente/evolucao?serie=2&janela=6#medida-1");
  assert.equal(progressionAllHref("3"), "/cliente/evolucao?serie=all&janela=3#historico-medidas");
  assert.equal(progressionMeasureHref(1, "all").includes("cintura"), false);
});
