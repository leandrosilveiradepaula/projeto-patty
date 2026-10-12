import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const page = fs.readFileSync(path.join(root,"app/cliente/evolucao/page.tsx"),"utf8");
const helper = fs.readFileSync(path.join(root,"lib/evaluations/client-progress-explorer.ts"),"utf8");

test("client exploration only reads already released finalized assessment measurements", () => {
  assert.match(page, /listCurrentClientFinalizedAssessmentMeasurements\(\)/);
  assert.match(page, /buildFactualProgressSeries\(assembleClientFinalizedAssessments\(rows\)\)/);
  assert.doesNotMatch(page, /getAccessibleClient\(|createAdminClient|supabase\.from|service_role/);
});
test("query controls preserve factual series and never publish patient data in the URL", () => {
  assert.match(page,/parseProgressObservationWindow\(janela\)/);
  assert.match(page,/parseProgressMeasureSelection\(serie, fullSeries\.length\)/);
  assert.match(page,/method="get"/);
  assert.match(page,/name="serie"/);
  assert.match(page,/name="janela"/);
  assert.match(page,/precisionSafeProgressDelta/);
  assert.match(page,/factualObservationPlot/);
  assert.match(helper,/measurement identifiers in URLs/);
});
test("links continue opening the exact finalized client assessment, not an administrative route", () => {
  assert.ok(page.includes('href={`/cliente/avaliacoes?avaliacao=${point.assessmentId}#avaliacao-${point.assessmentId}}'));
  assert.doesNotMatch(page,/href=\{\`\/admin\/avaliacoes/);
});
test("factual visualization keeps the exact table and no verdict on health goals", () => {
  assert.match(page,/<table className=\{styles\.table\}>/);
  assert.match(page,/sem escala de tempo/);
  assert.match(page,/não indica meta, melhora ou piora/);
  assert.doesNotMatch(page,/35 mL|Cutting 3|score automático de evolução/);
});
