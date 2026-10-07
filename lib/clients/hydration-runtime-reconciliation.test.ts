import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("assessment finalization does not generate hydration targets automatically", () => {
  const action = read("app/admin/avaliacoes/[avaliacaoId]/actions.ts");

  assert.doesNotMatch(action, /loadHydrationTargetResolution/);
  assert.doesNotMatch(action, /persistConfiguredHydrationTarget/);
  assert.doesNotMatch(action, /resolveAssessmentWeightKg/);
  assert.doesNotMatch(action, /meta de líquidos recalculada/);
  assert.match(action, /sem gerar meta automática de hidratação/);
});

test("admin check-ins expose factual records without a recalculation action", () => {
  const page = read("app/admin/clientes/[clienteId]/checkins/page.tsx");

  assert.doesNotMatch(page, /createHydrationTargetAction/);
  assert.doesNotMatch(page, /listAccessibleClientHydrationTargets/);
  assert.doesNotMatch(page, /Recalcular meta/);
  assert.match(page, /Registro factual/);
  assert.match(page, /regra profissional não estiver formalizada/);
});

test("client check-ins do not present an automatic hydration target or progress", () => {
  const page = read("app/cliente/checkins/page.tsx");

  assert.doesNotMatch(page, /listAccessibleClientHydrationTargets/);
  assert.doesNotMatch(page, /Meta atual/);
  assert.doesNotMatch(page, /Meta ainda não definida/);
  assert.doesNotMatch(page, /progress === null/);
  assert.match(page, /não define automaticamente uma meta diária de hidratação/);
  assert.match(page, /Total registrado/);
  assert.match(page, /Água pura/);
});

test("historical hydration infrastructure remains preserved as compatibility code", () => {
  assert.ok(fs.existsSync(path.join(root, "lib/method/hydration.ts")));
  assert.ok(fs.existsSync(path.join(root, "lib/method/hydration-loader.ts")));
  assert.ok(fs.existsSync(path.join(root, "lib/method/hydration-persistence.ts")));
});
