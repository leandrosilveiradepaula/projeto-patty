import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");
const professional = read("app/admin/clientes/[clienteId]/treino/page.tsx");
const client = read("app/cliente/treino/page.tsx");
const item = read("components/admin/AdminTrainingPlanItemForm.tsx");
const draft = read("components/admin/AdminTrainingPlanDraftForm.tsx");
const lifecycle = read("components/admin/AdminTrainingPlanLifecycleAction.tsx");
const actions = read("app/admin/clientes/[clienteId]/treino/actions.ts");

test("professional exercise choices come from published library in explicit stable order", () => {
  assert.ok(professional.includes("orderPublishedExerciseOptions("));
  assert.ok(professional.includes("Boolean(exercise.published_at)"));
  assert.ok(professional.includes("versionNumber: exercise.version_number"));
  assert.ok(item.includes("exercise.versionNumber"));
});

test("missing historical version blocks a silent conversion to manual exercise name", () => {
  assert.ok(item.includes("isHistoricalExerciseSelectionUnavailable("));
  assert.ok(item.includes("item?.exerciseVersionId"));
  assert.ok(item.includes("missingHistoricalVersion ? ("));
  assert.ok(item.includes("Versão original indisponível"));
  assert.ok(item.includes("A referência original foi preservada"));
  assert.ok(item.includes("disabled={missingHistoricalVersion || isPending}"));
  assert.ok(item.includes("event.preventDefault()"));
});

test("professional must explicitly choose a published version or a manual name", () => {
  assert.ok(item.includes("setSelectedExerciseId(event.target.value)"));
  assert.ok(item.includes('value="">Usar nome manual'));
  assert.ok(item.includes("required={!selectedExercise}"));
  assert.ok(item.includes("Boolean(selectedExercise) || missingHistoricalVersion"));
});

test("creating, adding and updating exercise rows retain distinct server operations", () => {
  assert.ok(item.includes("addTrainingPlanItemAction.bind("));
  assert.ok(item.includes("updateTrainingPlanItemAction.bind("));
  assert.ok(item.includes("if (state.success)"));
  assert.ok(item.includes("formRef.current?.reset()"));
  assert.ok(item.includes("router.refresh()"));
  assert.ok(item.includes("inFlightRef.current = true"));
  assert.ok(item.includes("inFlightRef.current = false"));
});

test("workout free-text doses of sets reps rest and execution remain editable rather than hardcoded", () => {
  for (const field of ["setsText","repetitionsText","restText","executionNotes"]) {
    assert.ok(item.includes('name="' + field + '"'), field);
  }
  assert.ok(!item.includes('defaultValue="3"'));
  assert.ok(!item.includes('defaultValue="12"'));
});

test("new training draft is protected from repeat submission before refresh", () => {
  assert.ok(draft.includes("inFlightRef.current = true"));
  assert.ok(draft.includes("inFlightRef.current = false"));
  assert.ok(draft.includes("!trainingPlanVersionId && state.success"));
  assert.ok(draft.includes("aria-busy={isPending}"));
  assert.ok(draft.includes("if (state.success) router.refresh()"));
  assert.ok(draft.includes("Salvar não publica o treino"));
});

test("review publication and deletion remain distinct and human-confirmed", () => {
  assert.ok(lifecycle.includes("reviewTrainingPlanVersionAction.bind("));
  assert.ok(lifecycle.includes("publishTrainingPlanVersionAction.bind("));
  assert.ok(lifecycle.includes("deleteTrainingPlanItemAction.bind("));
  assert.ok(lifecycle.includes("setConfirmTransition(true)"));
  assert.ok(lifecycle.includes("setConfirmTransition(false)"));
  assert.ok(lifecycle.includes("Confirmar revisão da versão"));
  assert.ok(lifecycle.includes("Confirmar publicação da versão"));
  assert.ok(lifecycle.includes("state.success || props.disabled"));
});

test("review confirmation names its version and deletion confirmation names its target", () => {
  assert.ok(professional.includes("versionNumber={openVersion.version_number}"));
  assert.ok(professional.includes("itemLabel={item.exercise_name}"));
  assert.ok(lifecycle.includes("props.versionNumber"));
  assert.ok(lifecycle.includes("props.itemLabel"));
  assert.ok(actions.includes("version.reviewed_at || version.published_at"));
});

test("react server refresh reinitializes a persisted exercise editor with actual values", () => {
  assert.ok(professional.includes("key={JSON.stringify(["));
  for (const s of ["item.exercise_version_id","item.sets_text","item.repetitions_text","item.execution_notes"]) {
    assert.ok(professional.includes(s), s);
  }
  assert.ok(professional.includes("exercicio-rascunho-"));
});

test("professional historical training versions sort by number and use specific anchors", () => {
  assert.ok(professional.includes("orderedVersions = [...versions].sort("));
  assert.ok(professional.includes("right.version_number - left.version_number"));
  assert.ok(professional.includes("versao-treino-"));
  assert.ok(professional.includes("pedido-treino-"));
  assert.ok(professional.includes("orderedRequests[0].id"));
});

test("client new-request alert links to the actual request and sees only published workouts", () => {
  assert.ok(client.includes("pedido-treino-"));
  assert.ok(client.includes("orderedRequests[0].id"));
  assert.ok(client.includes("publishedTrainingVersions(trainingVersions)"));
  assert.ok(client.includes("listAccessibleClientTrainingPlanItemsForVersions"));
  assert.ok(!client.includes("listExerciseVersionsVisibleToCurrentAdmin"));
  assert.ok(!client.includes("AdminTrainingPlanItemForm"));
});

test("training publication still uses server permissions and never follows catalog publication automatically", () => {
  assert.ok(actions.includes('requireRole("admin")'));
  assert.ok(actions.includes("publishAccessibleClientTrainingPlanVersion"));
  assert.ok(actions.includes("reviewAccessibleClientTrainingPlanVersion"));
  assert.ok(!actions.includes("publishAccessibleExerciseVersion"));
});
