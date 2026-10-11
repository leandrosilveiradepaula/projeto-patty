import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (file: string) => readFileSync(new URL("../../" + file, import.meta.url), "utf8");
const action = read("app/admin/exercicios/actions.ts");
const form = read("components/admin/AdminExerciseCreateForm.tsx");
const index = read("app/admin/exercicios/page.tsx");
const css = read("app/admin/exercicios/page.module.css");

test("server validates and normalizes name before creating even the parent exercise", () => {
  assert.ok(action.indexOf("name = readExerciseName(formData)") < action.indexOf("exercise = await createAccessibleExercise()"));
  assert.match(action, /typeof raw !== "string"/);
  assert.match(action, /raw\.trim\(\)/);
  assert.match(action, /name\.length === 0 \|\| name\.length > 200/);
  assert.match(action, /await requireRole\("admin"\)/);
  assert.match(action, /versionNumber: 1/);
});

test("creation distinguishes confirmed result from uncertain persistence", () => {
  assert.match(action, /Promise<CreateExerciseDraftResult>/);
  assert.match(action, /deleteAccessibleExerciseWithoutVersions\(exercise\.id\)/);
  assert.match(action, /exerciseId: null/);
  assert.match(action, /Confira a biblioteca antes de tentar novamente/);
  assert.match(action, /return \{ exerciseId: exercise\.id, message: null, success: true \}/);
  assert.doesNotMatch(action, /redirect\(/);
  assert.doesNotMatch(action, /publishAccessibleExerciseVersion/);
});

test("client keeps original name on failure and navigates only after confirmed success", () => {
  assert.match(form, /new FormData\(event\.currentTarget\)/);
  assert.match(form, /await createExerciseAction\(data\)/);
  assert.match(form, /if \(result\.success\)/);
  assert.match(form, /router\.push\("\/admin\/exercicios\/" \+ result\.exerciseId\)/);
  assert.match(form, /setErrorMessage\(result\.message\)/);
  assert.match(form, /finally \{/);
  assert.match(form, /inFlight\.current = false/);
  assert.match(form, /setPending\(false\)/);
  assert.match(form, /pending \|\| Boolean\(createdId\)/);
  assert.match(form, /onChange=\{\(\) => setErrorMessage\(null\)\}/);
  assert.doesNotMatch(form, /reset\(/);
  assert.doesNotMatch(form, /localStorage|sessionStorage|console\./);
});

test("operational recovery is accessible and points to actual exercise catalog", () => {
  assert.match(form, /role="status"/);
  assert.match(form, /live="assertive"/);
  assert.match(form, /href="#biblioteca-exercicios"/);
  assert.match(index, /id="biblioteca-exercicios"/);
  assert.match(form, /href=\{"\/admin\/exercicios\/" \+ createdId\}/);
  assert.match(css, /\.createFeedback \{/);
  assert.match(css, /grid-template-columns: minmax\(0, 1fr\);/);
});
