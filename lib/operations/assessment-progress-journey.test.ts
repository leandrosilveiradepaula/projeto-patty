import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (p: string) => readFileSync(new URL("../../" + p, import.meta.url), "utf8");

test("factual assessment history uses shared chronological ordering and preserves source IDs", () => {
  const history = read("app/cliente/avaliacoes/page.tsx");
  const helper = read("lib/evaluations/progress-journey.ts");
  assert.ok(history.includes("newestFactualAssessments("));
  assert.ok(helper.includes("Date.parse(left.assessedAt)"));
  assert.ok(helper.includes("Date.parse(right.assessedAt)"));
  assert.ok(history.includes('id={`avaliacao-${assessmentId}`}'));
  assert.ok(history.includes("Data indisponível"));
  assert.ok(!history.includes('variant="positive">Mais recente'));
});

test("factual evolution shows observations separately from comparisons on both screens", () => {
  for (const path of ["app/cliente/evolucao/page.tsx","app/admin/clientes/[clienteId]/evolucao/page.tsx"]) {
    const source = read(path);
    assert.ok(source.includes("summarizeFactualProgressCoverage(series)"), path);
    assert.ok(source.includes("coverage.comparableSeriesCount === 0"), path);
    assert.ok(source.includes("coverage.singleObservationSeriesCount > 0"), path);
    assert.ok(source.includes("mesma medida e unidade"), path);
    assert.ok(source.includes("buildFactualProgressSeries("), path);
    assert.ok(source.includes('id={`medida-${index}`}'), path);
    assert.ok(!source.includes("series.indexOf(item)"), path);
    assert.ok(!source.includes("melhora automática"), path);
  }
});

test("client evolution links exactly to the historical assessment that supplied each measurement", () => {
  const evolution = read("app/cliente/evolucao/page.tsx");
  const history = read("app/cliente/avaliacoes/page.tsx");
  const css = read("app/cliente/avaliacoes/page.module.css");
  assert.ok(evolution.includes('href={`/cliente/avaliacoes#avaliacao-${point.assessmentId}`}'));
  assert.ok(evolution.includes("Ir à avaliação"));
  assert.ok(history.includes('id={`avaliacao-${assessmentId}`}'));
  assert.ok(css.includes(".historyItem:target"));
  assert.ok(css.includes(".list > div[id]:target"));
  assert.ok(!evolution.includes("/admin/avaliacoes/"));
});

test("professional evolution retains authorized detail links and effective corrections", () => {
  const source = read("app/admin/clientes/[clienteId]/evolucao/page.tsx");
  assert.ok(source.includes('href={"/admin/avaliacoes/" + point.assessmentId}'));
  assert.ok(source.includes("getAccessibleClient(clienteId)"));
  assert.ok(source.includes("notFound()"));
  assert.ok(source.includes("applyAssessmentMeasurementCorrections("));
  assert.ok(source.includes("listAccessibleAssessmentMeasurementCorrections("));
  assert.ok(source.includes("coverage.comparableSeriesCount"));
});

test("client assessment and evolution read only finalized effective measurements", () => {
  for (const path of ["app/cliente/avaliacoes/page.tsx","app/cliente/evolucao/page.tsx"]) {
    const source = read(path);
    assert.ok(source.includes("listCurrentClientFinalizedAssessmentMeasurements()"));
    assert.ok(!source.includes("createAdminClient"));
    assert.ok(!source.includes("assessment_measurement_corrections"));
  }
  const helper = read("lib/evaluations/progress-journey.ts");
  assert.ok(!helper.includes("update("));
  assert.ok(!helper.includes("publish"));
});
