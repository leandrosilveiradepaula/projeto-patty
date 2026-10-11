import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const read = (p: string) => readFileSync(new URL("../../" + p, import.meta.url), "utf8");

test("training catalog is requested only when editing an unreviewed version", () => {
  const admin = read("app/admin/clientes/[clienteId]/treino/page.tsx");
  assert.match(admin, /openVersion && !openVersion.reviewed_at/);
  assert.match(admin, /await listExerciseVersionsVisibleToCurrentAdmin\(\)/);
  assert.match(admin, /orderPublishedExerciseOptions\(/);
  assert.match(admin, /Boolean\(exercise.published_at\)/);
});

test("client overview deep-links to the specific latest pending request", () => {
  const overview = read("app/admin/clientes/[clienteId]/page.tsx");
  const admin = read("app/admin/clientes/[clienteId]/treino/page.tsx");
  assert.match(overview, /treino#pedido-treino-\$\{orderedTrainingRequests\[0\].id\}/);
  assert.match(admin, /id=\{\x60pedido-treino-\$\{request.id\}\x60\}/);
  assert.match(admin, /trainingRequestOriginLabel/);
});

test("client sees training request provenance while preserving submitted notes", () => {
  const client = read("app/cliente/treino/page.tsx");
  assert.match(client, /trainingRequestOriginLabel\(request.recorded_by_profile_id/);
  assert.match(client, /request.note\?\.trim\(\)/);
});

test("published training and human review remain separate", () => {
  const admin = read("app/admin/clientes/[clienteId]/treino/page.tsx");
  assert.match(admin, /mode="review"/);
  assert.match(admin, /mode="publish"/);
  assert.match(admin, /trainingPlanVersionId=\{openVersion.id\}/);
});
