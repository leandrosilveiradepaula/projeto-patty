import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");
const adminPaths = [
  "app/admin/exercicios/actions.ts",
  "app/admin/exercicios/[exerciseId]/actions.ts",
  "app/admin/configuracoes/actions.ts",
  "app/admin/conteudos/actions.ts",
];

test("admin exercise, configuration and content mutations refresh operational queues", () => {
  for (const path of adminPaths) {
    const source = read(path);
    assert.match(source, /revalidatePath\("\/admin"\)/, path);
    assert.match(source, /revalidatePath\("\/admin\/pendencias"\)/, path);
  }
});

test("all exercise version transitions and configuration updates refresh queues", () => {
  for (const path of ["app/admin/exercicios/[exerciseId]/actions.ts", "app/admin/configuracoes/actions.ts"]) {
    const source = read(path);
    const writes = path.includes("exercicios")
      ? ["updateAccessibleExerciseDraftVersion", "publishAccessibleExerciseVersion", "createAccessibleExerciseVersion"]
      : ["updateMethodConfigurationAction", "updateWeeklyFeedbackScheduleAction", "updateAssessmentSchedulePreferencesAction"];
    for (const name of writes) {
      const start = source.indexOf(name);
      assert.ok(start >= 0, name);
      assert.ok(source.indexOf('revalidatePath("/admin/pendencias")', start) > start, name);
    }
  }
});

test("client registration refreshes client dashboard", () => {
  const source = read("app/cliente/perfil/actions.ts");
  assert.match(source, /revalidatePath\("\/cliente"\)/);
  assert.match(source, /revalidatePath\("\/cliente\/perfil"\)/);
});
