import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const ai = readFileSync(new URL("../../app/admin/anamneses/[anamneseId]/ia/actions.ts", import.meta.url), "utf8");
const review = readFileSync(new URL("../../app/admin/anamneses/[anamneseId]/revisao/actions.ts", import.meta.url), "utf8");
const historyPage = readFileSync(new URL("../../app/admin/anamneses/[anamneseId]/ia/page.tsx", import.meta.url), "utf8");

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


test("J7 renders findings only from a validated, completed, in-scope result", () => {
  assert.match(historyPage, /presentStoredAiReview\(\{/);
  assert.match(historyPage, /allowedSourceAnswerIds/);
  assert.match(historyPage, /allowedQuestionIds/);
  assert.match(historyPage, /status: execution\.status/);
  assert.match(historyPage, /const findings = review\.findings/);
  assert.match(historyPage, /review\.state === "missing_output"/);
  assert.match(historyPage, /review\.state === "invalid_output"/);
  assert.match(historyPage, /review\.state === "ready" && findings\.length === 0/);
  assert.doesNotMatch(historyPage, /readStoredFindings\(/);
  assert.match(historyPage, /Revisão humana obrigatória/);
  assert.doesNotMatch(historyPage, /autoPublish|sendToClient|automaticDiagnosis/);
});

test("J7 prioritizes client identity and handles invalid historical dates safely", () => {
  assert.match(historyPage, /submission\.clients\?\.full_name\?\.trim\(\)/);
  assert.match(historyPage, /submission\.clients\?\.profiles\?\.display_name\?\.trim\(\)/);
  assert.match(historyPage, /if \(!Number\.isFinite\(Date\.parse\(value\)\)\) return "Data indisponível"/);
});


test("J7 links a recorded human note to the exact immutable review without exposing its content", () => {
  assert.match(historyPage, /reviewId: action\.anamnesis_review_id/);
  assert.match(historyPage, /recordedAction\?\.reviewId && isUuid\(recordedAction\.reviewId\)/);
  assert.match(historyPage, /\/revisao#revisao-\$\{recordedAction\.reviewId\}/);
  assert.match(historyPage, /Abrir anotação profissional exata/);
  assert.match(historyPage, /!recordedAction \?/);
  assert.doesNotMatch(historyPage, /href=\{.*finding\.explanation/);
});
