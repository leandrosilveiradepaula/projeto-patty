import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../../app/admin/avaliacoes/[avaliacaoId]/actions.ts", import.meta.url), "utf8");

test("historical measurement correction does not interpret an empty value as zero", () => {
  assert.match(source, /parseAssessmentMeasurementNumber\(rawValue\)/);
  assert.match(source, /if \(value === null\)/);
});

test("professional follow-up refreshes operational workspace", () => {
  const section = source.slice(source.indexOf("export async function addProfessionalFollowUp"), source.indexOf("export type AssessmentDraftActionState"));
  assert.match(section, /revalidatePath\("\/admin"\)/);
  assert.match(section, /revalidatePath\("\/admin\/pendencias"\)/);
});

test("historical measurement corrections refresh assessment queues", () => {
  const section = source.slice(source.indexOf("export async function correctFinalizedAssessmentMeasurementAction"));
  assert.match(section, /revalidatePath\("\/admin\/avaliacoes"\)/);
  assert.match(section, /revalidatePath\("\/admin\/pendencias"\)/);
});
