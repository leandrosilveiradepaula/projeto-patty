import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const ai = readFileSync(new URL("../../app/admin/anamneses/[anamneseId]/ia/actions.ts", import.meta.url), "utf8");
const review = readFileSync(new URL("../../app/admin/anamneses/[anamneseId]/revisao/actions.ts", import.meta.url), "utf8");

test("AI review rejects invalid submission identifiers before execution", () => {
  const section = ai.slice(ai.indexOf("export async function runAdminAnamnesisAiReview"), ai.indexOf("export async function acceptAiFindingAsInternalObservation"));
  assert.ok(section.indexOf("!isUuid(submissionId)") < section.indexOf("executeOpenAiAnamnesisReview("));
});

test("AI finding actions validate UUIDs and safe indexes", () => {
  assert.equal(ai.split("!Number.isSafeInteger(findingIndex)").length - 1, 2);
  assert.equal(ai.split("!isUuid(executionId)").length - 1, 3);
});

test("acceptance and professional note update operational AI queues", () => {
  for (const marker of ["accepted_internal_observation", "converted_to_patty_note"]) {
    const section = ai.slice(ai.indexOf('action: "' + marker + '"'), ai.indexOf('action: "' + marker + '"') + 450);
    assert.match(section, /revalidatePath\("\/admin\/ia"\)/);
    assert.match(section, /revalidatePath\("\/admin\/pendencias"\)/);
  }
});

test("professional review note has explicit length limit", () => {
  assert.match(review, /value\.trim\(\)\.length > 4000/);
});
