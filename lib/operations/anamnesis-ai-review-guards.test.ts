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
  assert.equal(ai.split("!Number.isSafeInteger(findingIndex)").length - 1, 3);
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
  assert.match(historyPage, /action\.anamnesis_review_id/);
  assert.match(historyPage, /isUuid\(action\.anamnesis_review_id\)/);
  assert.match(historyPage, /\/revisao#revisao-\$\{action\.anamnesis_review_id\}/);
  assert.match(historyPage, /Abrir anotação profissional exata/);
  assert.match(historyPage, /!hasRecordedAction \?/);
  assert.doesNotMatch(historyPage, /href=\{.*finding\.explanation/);
});

test("J7 displays decision timestamp separately from immutable AI finding", () => {
  assert.match(historyPage, /formatDateTime\(action\.created_at\)/);
  assert.match(historyPage, /formatDateTime\(action\.created_at\)/);
  assert.match(historyPage, /registra.+em/);
  assert.match(historyPage, /original da IA foi preservado/);
  assert.match(historyPage, /execution\.status === "completed" \? "Concluída"/);
  assert.match(historyPage, /execution\.status === "failed" \? "Falhou"/);
  assert.match(historyPage, /execution\.status === "started" \? "Iniciada"/);
});


test("J7 keeps every distinct persisted human action visible instead of silently replacing it", () => {
  assert.match(historyPage, /findingActionsByExecutionId\.get\(action\.execution_id\) \?\? \[\]/);
  assert.match(historyPage, /existing\.push\(action\)/);
  assert.match(historyPage, /recordedActions\.map\(\(action\) =>/);
  assert.match(historyPage, /key=\{action\.id\}/);
  assert.match(historyPage, /recordedActions\.length > 1/);
  assert.match(historyPage, /Mais de uma decisão registrada/);
  assert.match(historyPage, /!hasRecordedAction/);
});

test("J7 links validated finding sources to exact, authorized original questions", () => {
  const originalPage = readFileSync(new URL("../../app/admin/anamneses/[anamneseId]/page.tsx", import.meta.url), "utf8");
  const originalCss = readFileSync(new URL("../../app/admin/anamneses/[anamneseId]/page.module.css", import.meta.url), "utf8");
  const aiCss = readFileSync(new URL("../../app/admin/anamneses/[anamneseId]/ia/page.module.css", import.meta.url), "utf8");
  assert.ok(historyPage.includes("sourceReferences = finding.source_answer_ids.map"));
  assert.ok(historyPage.includes("answersById.get(answerId)?.question_id"));
  assert.ok(historyPage.includes("#resposta-${source.questionId}"));
  assert.ok(historyPage.includes("#resposta-${finding.target_question_id}"));
  assert.ok(historyPage.includes("Ver resposta original:"));
  assert.ok(historyPage.includes("Ver pergunta original:"));
  assert.ok(originalPage.includes("id={`resposta-${question.id}`}"));
  assert.ok(originalPage.includes("getAccessibleAnamnesisSubmission(anamneseId)"));
  assert.ok(originalPage.includes("listAccessibleAnamnesisAnswers(submission.id)"));
  assert.ok(originalPage.includes("submission.clients?.full_name?.trim()"));
  assert.ok(originalCss.includes(".questionCard:target"));
  assert.ok(aiCss.includes(".sourceLink:focus-visible"));
  assert.ok(!historyPage.includes("#resposta-${answerId}"));
});

test("J7 shows immutable actor identity only with RLS-visible profile names", () => {
  const actionsRead = readFileSync(new URL("../../lib/ai/finding-actions.ts", import.meta.url), "utf8");
  const historyCss = readFileSync(new URL("../../app/admin/anamneses/[anamneseId]/ia/page.module.css", import.meta.url), "utf8");
  assert.match(actionsRead, /orderedRows\.map\(\(action\) => action\.acted_by_profile_id\)/);
  assert.match(actionsRead, /const profileSupabase = await createClient\(\)/);
  assert.match(actionsRead, /\.from\("profiles"\)/);
  assert.match(actionsRead, /\.select\("id, display_name"\)/);
  assert.match(actionsRead, /actor_display_name: namesById\.get\(action\.acted_by_profile_id\) \?\? null/);
  assert.match(historyPage, /Responsável pela decisão:/);
  assert.match(historyPage, /action\.actor_display_name \|\| "Nome não disponível"/);
  assert.match(historyPage, /action\.acted_by_profile_id/);
  assert.match(historyPage, /Ver identificador do responsável/);
  assert.match(historyCss, /\.actorAudit summary:focus-visible/);
  assert.doesNotMatch(historyPage, /auth\.users|actor\.email|autoPublish/);
});

test("J7 refuses to misattribute immutable human decisions to a mismatched AI finding", () => {
  const integrity = readFileSync(new URL("../../lib/ai/finding-action-integrity.ts", import.meta.url), "utf8");
  const css = readFileSync(new URL("../../app/admin/anamneses/[anamneseId]/ia/page.module.css", import.meta.url), "utf8");
  assert.match(historyPage, /auditFindingActionLinks\(/);
  assert.match(historyPage, /findingActionsByExecutionId\.get\(execution\.id\)/);
  assert.match(historyPage, /audit\.matchedByIndex\.get\(index\)/);
  assert.match(historyPage, /audit\.lockedIndices\.has\(index\)/);
  assert.match(historyPage, /hasRecordedAction && recordedActions\.length === 0/);
  assert.match(historyPage, /Decisão histórica não associável/);
  assert.match(historyPage, /audit\.unmatchedActions\.map\(\(action\) =>/);
  assert.match(historyPage, /Vínculo histórico de decisão exige conferência/);
  assert.match(historyPage, /audit\.pendingIndices\.length/);
  assert.match(historyPage, /Ir ao primeiro achado aguardando decisão/);
  assert.match(historyPage, /id=\{`achado-ia-\$\{execution\.id\}-\$\{index\}`\}/);
  assert.match(css, /\.finding:target/);
  assert.match(integrity, /findingSnapshotMatches\(action\.finding_snapshot, findings\[index\]\)/);
  assert.match(integrity, /lockedIndices\.add\(index\)/);
  assert.doesNotMatch(historyPage, /finding\.explanation[^\n]*href/);
});

test("J7 validates the exact output again server-side before any privileged human action", () => {
  const start = ai.indexOf("async function requireExactAccessibleAiExecution(");
  const end = ai.indexOf("export type AdminAiReviewFormState", start);
  const boundary = ai.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.match(boundary, /assertAiExecutionBelongsToSubmission\(/);
  assert.match(boundary, /if \(state !== "completed"\) return/);
  assert.match(boundary, /listAccessibleAnamnesisAnswers\(submission\.id\)/);
  assert.match(boundary, /listAccessibleAnamnesisQuestions\(submission\.form_version_id\)/);
  assert.match(boundary, /listAccessibleAiExecutionOutputs\(\[executionId\]\)/);
  assert.match(boundary, /presentStoredAiReview\(\{/);
  assert.match(boundary, /allowedQuestionIds:/);
  assert.match(boundary, /allowedSourceAnswerIds:/);
  assert.match(boundary, /result\.state !== "ready" \|\| !result\.findings\[findingIndex\]/);
  for (const name of ["acceptAiFindingAsInternalObservation", "createPattyNoteFromAiFinding"]) {
    const begin = ai.indexOf("export async function " + name);
    const next = ai.indexOf("export async function ", begin + 20);
    const mutation = ai.slice(begin, next < 0 ? undefined : next);
    const guardedAt = mutation.indexOf('requireExactAccessibleAiExecution(submissionId, executionId, "completed", findingIndex)');
    const privilegedAt = mutation.indexOf("await recordAiFindingAction(");
    assert.ok(guardedAt >= 0 && privilegedAt > guardedAt, name);
  }
});
