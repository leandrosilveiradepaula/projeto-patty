import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");
const forms = read("components/admin/AdminExerciseLifecycleForms.tsx");
const actions = read("app/admin/exercicios/[exerciseId]/actions.ts");

function part(from: string, to?: string) {
  const start = forms.indexOf("export function " + from + "(");
  assert.ok(start >= 0, from);
  const end = to ? forms.indexOf("export function " + to + "(", start+1) : forms.length;
  assert.ok(end > start, from);
  return forms.slice(start,end);
}

test("admin library remains separate from client-only prescribed workout selection",()=>{
  const page=read("app/admin/exercicios/page.tsx");
  const client=read("app/cliente/exercicios/page.tsx");
  const workout=read("app/cliente/treino/page.tsx");
  assert.match(page,/Catálogo profissional/);
  assert.match(page,/treinos individuais e publicados/);
  assert.match(page,/newestExerciseLibrarySummaries\(/);
  assert.match(client,/redirect\("\/cliente\/treino"\)/);
  assert.ok(!client.includes("listExerciseVersionsVisibleToCurrentAdmin"));
  assert.match(workout,/publishedTrainingVersions\(trainingVersions\)/);
});

test("library history chooses stable version numbers independently of SQL ordering",()=>{
  const detail=read("app/admin/exercicios/[exerciseId]/page.tsx");
  assert.match(detail,/\.sort\(\(left, right\) =>/);
  assert.match(detail,/right\.version_number - left\.version_number/);
  assert.match(detail,/left\.id\.localeCompare\(right\.id\)/);
  assert.match(detail,/id=\{`versao-\$\{version\.id\}`\}/);
  assert.match(detail,/findSingleDraftExerciseVersion\(versions\)/);
  assert.match(detail,/nextExerciseVersionNumber\(versions\)/);
});

test("edit form validates and saves name without reloading or publishing",()=>{
  const partSource=part("AdminExerciseDraftEditForm","AdminExercisePublishForm");
  assert.match(partSource,/normalizedName\.length > 0 && normalizedName\.length <= 200/);
  assert.match(partSource,/normalizedName !== initialName/);
  assert.match(partSource,/maxLength=\{200\}/);
  assert.match(partSource,/updateExerciseDraftAction\(exerciseId, versionId, data\)/);
  assert.match(partSource,/router\.refresh\(\)/);
  assert.match(partSource,/Descartar edição/);
  assert.match(partSource,/inFlight\.current = true/);
  assert.match(partSource,/inFlight\.current = false/);
  assert.ok(!partSource.includes("publishExerciseVersionAction("));
});

test("publishing a specific draft requires a second professional confirmation step",()=>{
  const partSource=part("AdminExercisePublishForm","AdminExerciseCreateVersionForm");
  assert.match(partSource,/setReviewing\(true\)/);
  assert.match(partSource,/name=\{?["']confirmPublish["']/);
  assert.match(partSource,/checked=\{confirmed\}/);
  assert.match(partSource,/!reviewing \|\| !confirmed \|\| busy \|\| completed/);
  assert.match(partSource,/data\.set\("confirmPublish", "yes"\)/);
  assert.match(partSource,/publishExerciseVersionAction\(exerciseId, versionId, data\)/);
  assert.match(partSource,/Confirmar publicação/);
  assert.match(partSource,/Nenhuma cliente recebeu um treino automaticamente/);
  assert.match(partSource,/router\.refresh\(\)/);
  assert.match(actions,/formData\.get\("confirmPublish"\) !== "yes"/);
  assert.match(actions,/findSingleDraftExerciseVersion\(versions\)/);
});

test("new version creation requires a separate confirmation and preserves published history",()=>{
  const partSource=part("AdminExerciseCreateVersionForm");
  assert.match(partSource,/setReviewing\(true\)/);
  assert.match(partSource,/Confirmar novo rascunho/);
  assert.match(partSource,/createNextExerciseVersionAction\(exerciseId\)/);
  assert.match(partSource,/inFlight\.current \|\|/);
  assert.match(partSource,/completed/);
  assert.match(partSource,/router\.refresh\(\)/);
  assert.match(actions,/Já existe uma versão em rascunho para este exercício/);
});

test("all exercise mutations keep server role, version, and publication guards",()=>{
  assert.match(actions,/await requireRole\("admin"\)/);
  assert.match(actions,/isUuid\(versionId\)/);
  assert.match(actions,/draft\.id !== versionId/);
  assert.match(actions,/publishAccessibleExerciseVersion/);
  assert.match(actions,/updateAccessibleExerciseDraftVersion/);
  assert.match(actions,/createAccessibleExerciseVersion/);
  assert.ok(!actions.includes("createAccessibleClientTrainingPrescription"));
});

test("client-side feedback is explicit about failed persistence and safe on repeated submissions",()=>{
  assert.match(forms,/ActionFeedback/);
  assert.match(forms,/live=\{success \? "polite" : "assertive"\}/);
  assert.match(forms,/const inFlight = useRef\(false\)/);
  assert.match(forms,/event\.preventDefault\(\)/);
  assert.match(forms,/setBusy\(true\)/);
  assert.match(forms,/setBusy\(false\)/);
  assert.match(forms,/A versão publicada anteriormente continua preservada/);
  assert.ok(!forms.includes("window.location.reload()"));
});

test("catalogue sorting and badges convey chronology but never client prescription",()=>{
  const page=read("app/admin/exercicios/page.tsx");
  assert.match(page,/variant=\{\s*exerciseVersion\.published_at \? "neutral" : "warning"/);
  assert.match(page,/Versão atual em rascunho/);
  assert.match(page,/Versão .* permanece publicada/);
  assert.ok(!page.includes("assignExerciseToClient"));
});

test("new exercise remains a draft with explicit validation and no automatic publication",()=>{
  const source=read("app/admin/exercicios/actions.ts");
  assert.match(source,/await requireRole\("admin"\)/);
  assert.match(source,/readExerciseName\(formData\)/);
  assert.match(source,/createAccessibleExerciseVersion\(\{/);
  assert.match(source,/versionNumber: 1/);
  assert.ok(!source.includes("publishAccessibleExerciseVersion"));
});
