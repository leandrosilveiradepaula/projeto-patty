import assert from "node:assert/strict";
import test from "node:test";
import { parseAssessmentDefinitionConfiguration } from "../evaluations/assessment-definition.ts";

const valid = () => ({
  kindKey: "monthly",
  requiredMeasurements: [{ key: "peso", label: "Peso", aliases: ["weight"] }],
  photoRequirement: { label: "Fotos", minimumCount: 1 },
});

test("accepts valid configurable assessment requirements", () => {
  const parsed = parseAssessmentDefinitionConfiguration(valid());
  assert.equal(parsed.requiredMeasurements[0].key, "peso");
  assert.equal(parsed.photoRequirement?.minimumCount, 1);
});

test("rejects oversized assessment kind keys", () => {
  assert.throws(() => parseAssessmentDefinitionConfiguration({ ...valid(), kindKey: "k".repeat(121) }), /kindKey exceeds/);
});

test("rejects oversized measurement keys and labels", () => {
  for (const item of [{ key: "x".repeat(121), label: "Peso", aliases: [] }, { key: "peso", label: "x".repeat(201), aliases: [] }]) {
    assert.throws(() => parseAssessmentDefinitionConfiguration({ ...valid(), requiredMeasurements: [item] }), /exceeds maximum/);
  }
});

test("rejects oversized aliases", () => {
  assert.throws(() => parseAssessmentDefinitionConfiguration({ ...valid(), requiredMeasurements: [{ key: "peso", label: "Peso", aliases: ["x".repeat(121)] }] }), /overlong alias/);
});

test("rejects unsafe photo counts and oversized photo labels", () => {
  assert.throws(() => parseAssessmentDefinitionConfiguration({ ...valid(), photoRequirement: { label: "Fotos", minimumCount: Number.MAX_SAFE_INTEGER + 1 } }), /positive integer/);
  assert.throws(() => parseAssessmentDefinitionConfiguration({ ...valid(), photoRequirement: { label: "x".repeat(201), minimumCount: 1 } }), /maximum length/);
});
