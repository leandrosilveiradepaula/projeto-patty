import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) =>
  readFileSync(new URL("../../" + path, import.meta.url), "utf8");
const draft = read("components/admin/AssessmentDraftForms.tsx");

test("editing assessment metadata refreshes the real workspace after persistence", () => {
  const chunk = draft.slice(
    draft.indexOf("export function AssessmentDraftMetadataForm"),
    draft.indexOf("export function AssessmentMeasurementForm"),
  );
  assert.match(chunk, /updateAssessmentDraftAction\.bind/);
  assert.match(chunk, /if \(state\.success\) router\.refresh\(\)/);
});

test("measurement save clears the entry only on success and refreshes readiness", () => {
  const chunk = draft.slice(
    draft.indexOf("export function AssessmentMeasurementForm"),
    draft.indexOf("export function AssessmentDeleteMeasurementButton"),
  );
  assert.match(chunk, /if \(state\.success\)/);
  assert.match(chunk, /formRef\.current\?\.reset\(\)/);
  assert.match(chunk, /router\.refresh\(\)/);
  assert.match(chunk, /disabled=\{measurementOptions\.length === 0\}/);
  assert.match(chunk, /Salvar medida/);
});

test("removing a draft measurement requires a separate confirmation step", () => {
  const chunk = draft.slice(
    draft.indexOf("export function AssessmentDeleteMeasurementButton"),
    draft.indexOf("export function AssessmentPhotoLinkForm"),
  );
  assert.match(chunk, /useState\(false\)/);
  assert.match(chunk, /setConfirmRemoval\(true\)/);
  assert.match(chunk, /setConfirmRemoval\(false\)/);
  assert.match(chunk, /Confirmar remoção/);
  assert.match(chunk, /router\.refresh\(\)/);
});

test("linking a private assessment photo refreshes only after confirmed success", () => {
  const chunk = draft.slice(
    draft.indexOf("export function AssessmentPhotoLinkForm"),
    draft.indexOf("export function AssessmentPhotoUnlinkButton"),
  );
  assert.match(chunk, /if \(state\.success\)/);
  assert.match(chunk, /formRef\.current\?\.reset\(\)/);
  assert.match(chunk, /router\.refresh\(\)/);
  assert.match(chunk, /disabled=\{photos\.length === 0\}/);
});

test("unlinking preserves the private source file and requires confirmation", () => {
  const chunk = draft.slice(
    draft.indexOf("export function AssessmentPhotoUnlinkButton"),
    draft.indexOf("export function AssessmentFinalizeForm"),
  );
  assert.match(chunk, /setConfirmUnlink\(true\)/);
  assert.match(chunk, /setConfirmUnlink\(false\)/);
  assert.match(chunk, /arquivo privado original será preservado/);
  assert.match(chunk, /Confirmar desvinculação/);
  assert.match(chunk, /router\.refresh\(\)/);
});

test("finalization honors configured readiness, admin confirmation and refreshes", () => {
  const chunk = draft.slice(draft.indexOf("export function AssessmentFinalizeForm"));
  assert.match(chunk, /canFinalize/);
  assert.match(chunk, /confirmFinalization/);
  assert.match(chunk, /disabled=\{!canFinalize \|\| isPending\}/);
  assert.match(chunk, /if \(state\.success\) router\.refresh\(\)/);
  assert.match(chunk, /disabled=\{!canFinalize\}/);
});

test("correction entry matches server note limit and refreshes effective values", () => {
  const form = read("components/admin/AssessmentCorrectionForm.tsx");
  const action = read("app/admin/avaliacoes/[avaliacaoId]/actions.ts");
  assert.match(form, /maxLength=\{4000\} name="correctionNote"/);
  assert.match(form, /if \(state\.success\) router\.refresh\(\)/);
  assert.match(action, /note\.length > 4000/);
  assert.match(action, /createAccessibleAssessmentMeasurementCorrection\(/);
});

test("professional follow-up refreshes decision history and enforces matching text length", () => {
  const form = read("components/admin/EvaluationProfessionalFollowUpForm.tsx");
  const action = read("app/admin/avaliacoes/[avaliacaoId]/actions.ts");
  assert.match(form, /if \(state\.success\)/);
  assert.match(form, /formRef\.current\?\.reset\(\)/);
  assert.match(form, /router\.refresh\(\)/);
  for (const field of ["difficulty", "adherencePerception", "decisionReason", "pattyObservation"]) {
    assert.ok(form.includes(`maxLength={4000}\n            name="${field}"`), field);
  }
  assert.match(action, /createAccessibleProfessionalFollowUp\(/);
});

test("pending assessments remain navigable with explicit empty state", () => {
  const page = read("app/admin/clientes/[clienteId]/avaliacoes/page.tsx");
  assert.match(page, /id="avaliacoes-em-andamento"/);
  assert.match(page, /title="Nenhuma avaliação em andamento"/);
  assert.match(page, /draftAssessments\.length === 0/);
  assert.match(page, /draftAssessments\.map/);
});

test("effective corrected measurements are labeled accurately and can be recorrected", () => {
  const page = read("app/admin/avaliacoes/[avaliacaoId]/page.tsx");
  assert.match(page, /Valores vigentes de cada medida/);
  assert.match(page, /valor original permanece preservado/);
  assert.match(page, /key=\{measurement\.latest_correction_id \?\? measurement\.id\}/);
  assert.match(page, /measurementCorrections\.map/);
});

test("assessment create form tracks configured options without inventing a kind", () => {
  const form = read("components/admin/AssessmentCreateForm.tsx");
  assert.match(form, /value=\{selectedKind\}/);
  assert.match(form, /setSelectedKind\(event\.target\.value\)/);
  assert.match(form, /disabled=\{kindOptions\.length === 0\}/);
});

test("assessment operations still require admin, persist before cache invalidation, and do not publish automatically", () => {
  const action = read("app/admin/avaliacoes/[avaliacaoId]/actions.ts");
  assert.match(action, /requireRole\("admin"\)/);
  assert.match(action, /getDraftAssessment\(assessmentId\)/);
  assert.match(action, /finalizeAssessmentWithMethodSnapshot\(/);
  assert.match(action, /revalidatePath\("\/cliente\/evolucao"\)/);
  assert.ok(!draft.includes("publishProtocolVersion"));
});
