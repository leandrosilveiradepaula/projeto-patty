import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../../app/admin/avaliacoes/[avaliacaoId]/actions.ts", import.meta.url), "utf8");

test("assessment actions validate UUIDs before fetching private assessments", () => {
  assert.equal(source.split("isUuid(assessmentId) ? await getAccessibleClientAssessment(assessmentId) : null").length - 1, 3);
});

test("professional follow-up requires bounded decision reasons", () => {
  const section = source.slice(source.indexOf("export async function addProfessionalFollowUp"), source.indexOf("export type AssessmentDraftActionState"));
  assert.match(section, /reasonValue\.trim\(\)\.length > 4000/);
});

test("professional follow-up bounds adherence, difficulty and observations", () => {
  const section = source.slice(source.indexOf("export async function addProfessionalFollowUp"), source.indexOf("export type AssessmentDraftActionState"));
  for (const key of ["adherencePerception", "difficulty", "pattyObservation"]) assert.ok(section.includes(key));
  assert.match(section, /entry\.trim\(\)\.length > 4000/);
});

test("historical correction validates measurement identifier and bounds notes", () => {
  const section = source.slice(source.indexOf("export async function correctFinalizedAssessmentMeasurementAction"));
  assert.match(section, /isUuid\(measurementId\) \? measurements\.find/);
  assert.match(section, /note && note\.length > 4000/);
});
