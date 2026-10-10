import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("historical assessment deep links reveal the originally selected closed native disclosure", () => {
  const history = read("app/cliente/avaliacoes/page.tsx");
  const disclosure = read("components/client/ClientHistoryDisclosure.tsx");
  assert.ok(history.includes("<ClientAssessmentHistoryDisclosure"));
  assert.ok(read("app/cliente/avaliacoes/ClientAssessmentHistoryDisclosure.tsx").includes("ClientHistoryDisclosure as ClientAssessmentHistoryDisclosure"));
  assert.ok(history.includes('id={`avaliacao-${assessmentId}`}'));
  assert.ok(disclosure.includes("const target = document.getElementById(targetId)"));
  assert.ok(disclosure.includes("details.contains(target)"));
  assert.ok(disclosure.includes("details.open = true"));
  assert.ok(disclosure.includes('target.scrollIntoView({ block: "start" })'));
  assert.ok(disclosure.includes('window.addEventListener("hashchange", revealTarget)'));
  assert.ok(disclosure.includes('window.removeEventListener("hashchange", revealTarget)'));
  assert.ok(disclosure.includes("revealTarget();"));
});

test("older assessments are opened on demand and can still be toggled manually", () => {
  const history = read("app/cliente/avaliacoes/page.tsx");
  const disclosure = read("components/client/ClientHistoryDisclosure.tsx");
  assert.ok(history.includes("if (assessmentIndex === 0)"));
  assert.ok(history.includes('id={`avaliacao-${assessmentId}`}'));
  assert.ok(disclosure.includes("<details"));
  assert.ok(disclosure.includes("<summary>{summary}</summary>"));
  assert.ok(!disclosure.includes('open={true}'));
  assert.ok(!disclosure.includes("localStorage"));
  assert.ok(!disclosure.includes("fetch("));
});

test("same-day assessment navigation labels are distinguishable without invented version numbers", () => {
  const page = read("app/cliente/avaliacoes/page.tsx");
  assert.ok(page.includes("items.map((assessment, index) =>"));
  assert.ok(page.includes("Avaliação {index + 1}: {formatDate(assessment.assessedAt)}"));
  assert.ok(page.includes("assessmentIndex + 1"));
  assert.ok(page.includes("items.length"));
  assert.ok(page.includes("summary={"));
});

test("evolution links still resolve to the exact client-side historical assessment", () => {
  const progress = read("app/cliente/evolucao/page.tsx");
  const history = read("app/cliente/avaliacoes/page.tsx");
  assert.ok(progress.includes('href={`/cliente/avaliacoes#avaliacao-${point.assessmentId}`}'));
  assert.ok(history.includes('id={`avaliacao-${assessmentId}`}'));
  assert.ok(!progress.includes("/admin/avaliacoes/"));
});

test("professional comparison links to the authorized previous assessment, not an arbitrary client", () => {
  const page = read("app/admin/avaliacoes/[avaliacaoId]/page.tsx");
  assert.ok(page.includes("previousAssessment && factualComparison.length > 0"));
  assert.ok(page.includes('href={`/admin/avaliacoes/${previousAssessment.id}`}'));
  assert.ok(page.includes("Abrir avaliação anterior de"));
  assert.ok(page.includes("getAccessibleClientAssessment(avaliacaoId)"));
  assert.ok(page.includes("listAccessibleAssessmentsForClient(assessment.client_id)"));
  assert.ok(page.includes("new Date(assessment.assessed_at).getTime()"));
});

test("measurement comparison rows avoid colliding when two raw keys share a display label", () => {
  const comparison = read("components/admin/EvaluationMeasureComparison.tsx");
  const formatter = read("lib/evaluations/professional-view.ts");
  assert.ok(formatter.includes('waist: "Cintura"'));
  assert.ok(formatter.includes('cintura: "Cintura"'));
  assert.ok(comparison.includes("items.map((item, index) =>"));
  assert.ok(comparison.includes('key={item.label + ":" + (item.unit ?? "") + ":" + index}'));
  assert.ok(!comparison.includes("<tr key={item.label}>"));
  assert.ok(comparison.includes('scope="row"'));
});

test("professional comparison link remains accessible on mobile screens", () => {
  const css = read("app/admin/avaliacoes/[avaliacaoId]/page.module.css");
  assert.ok(css.includes(".comparisonStack"));
  assert.ok(css.includes("min-width: 0"));
  assert.ok(css.includes("@media (max-width: 640px)"));
  assert.ok(css.includes("width: 100%"));
  assert.ok(css.includes(".backLink:focus-visible"));
});

test("assessment disclosure does not bypass finalized client data access or professional approval", () => {
  const history = read("app/cliente/avaliacoes/page.tsx");
  const progress = read("app/cliente/evolucao/page.tsx");
  const disclosure = read("components/client/ClientHistoryDisclosure.tsx");
  for (const source of [history, progress]) {
    assert.ok(source.includes("listCurrentClientFinalizedAssessmentMeasurements()"));
    assert.ok(!source.includes("createAdminClient"));
    assert.ok(!source.includes("assessment_measurement_corrections"));
  }
  assert.ok(!disclosure.includes("use server"));
  assert.ok(!disclosure.includes("publish"));
});
