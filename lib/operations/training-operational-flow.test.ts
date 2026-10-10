import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const read = (path: string) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("both client and professional views order training requests by factual timestamp", () => {
  for (const path of ["app/cliente/treino/page.tsx", "app/admin/clientes/[clienteId]/treino/page.tsx"]) {
    const source = read(path);
    assert.match(source, /newestTrainingRequests\(requests\)/);
    assert.match(source, /orderedRequests\[0\]/);
  }
});

test("professional selects latest unfinished version and preserves exercise order", () => {
  const source = read("app/admin/clientes/[clienteId]/treino/page.tsx");
  assert.match(source, /newestUnpublishedTrainingVersion\(versions\)/);
  assert.match(source, /sortedOpenItems\.map/);
  assert.match(source, /sortedPublishedItems\.map/);
});

test("new training request is visible even when an unfinished prescription exists", () => {
  const source = read("app/admin/clientes/[clienteId]/treino/page.tsx");
  assert.ok(!source.includes("!openVersion && requests[0]"));
  assert.match(source, /Já existe um rascunho em preparação/);
});

test("the add-item form resets only on successful save and distinguishes manual from library selection", () => {
  const source = read("components/admin/AdminTrainingPlanItemForm.tsx");
  assert.match(source, /formRef\.current\?\.reset\(\)/);
  assert.ok(source.includes('setSelectedExerciseId("")'));
  assert.match(source, /disabled=\{isPending \|\| Boolean\(selectedExercise\) \|\| missingHistoricalVersion\}/);
  assert.match(source, /required=\{!selectedExercise\}/);
  assert.match(source, /router\.refresh\(\)/);
});

test("draft creation and changes refresh the real professional workspace", () => {
  const source = read("components/admin/AdminTrainingPlanDraftForm.tsx");
  assert.match(source, /if \(state\.success\) router\.refresh\(\)/);
});

test("review and publication are individually confirmed before invoking a server action", () => {
  const source = read("components/admin/AdminTrainingPlanLifecycleAction.tsx");
  assert.match(source, /setConfirmTransition\(true\)/);
  assert.match(source, /Confirmar revisão/);
  assert.match(source, /Confirmar publicação/);
  assert.match(source, /setConfirmTransition\(false\)/);
  assert.match(source, /if \(state\.success\) router\.refresh\(\)/);
});

test("manual professional training requests refresh after confirmed success", () => {
  const source = read("components/admin/AdminTrainingRequestForm.tsx");
  assert.ok(source.indexOf("router.refresh()") > source.indexOf("if (state.success)"));
});
