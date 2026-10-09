import assert from "node:assert/strict";
import test from "node:test";
import { buildConfigurableAssessmentReadiness, parseAssessmentDefinitionConfiguration } from "../evaluations/assessment-definition.ts";

const valid = () => ({
  kindKey: "monthly",
  requiredMeasurements: [{ key: "peso", label: "Peso", aliases: ["weight"] }],
  photoRequirement: { label: "Fotos", minimumCount: 1 },
});

test("normalizes assessment kind identifiers consistently", () => {
  assert.equal(parseAssessmentDefinitionConfiguration({ ...valid(), kindKey: " Mês Completo " }).kindKey, "mes_completo");
});

test("rejects assessment kind identifiers that normalize to empty", () => {
  assert.throws(() => parseAssessmentDefinitionConfiguration({ ...valid(), kindKey: "\u0301" }), /valid identifier/);
});

test("rejects measurement identifiers that normalize to empty", () => {
  assert.throws(() => parseAssessmentDefinitionConfiguration({ ...valid(), requiredMeasurements: [{ key: "\u0301", label: "Peso", aliases: [] }] }), /valid identifier/);
});

test("rejects aliases that normalize to empty", () => {
  assert.throws(() => parseAssessmentDefinitionConfiguration({ ...valid(), requiredMeasurements: [{ key: "peso", label: "Peso", aliases: ["\u0301"] }] }), /valid identifiers/);
});

test("readiness rejects unsafe photo counts and invalid measurement arrays", () => {
  assert.throws(() => buildConfigurableAssessmentReadiness(valid(), { measurementKeys: [], photoCount: Number.MAX_SAFE_INTEGER + 1 }), /non-negative integer/);
  assert.throws(() => buildConfigurableAssessmentReadiness(valid(), { measurementKeys: [null] as unknown as string[], photoCount: 0 }), /array of strings/);
});
