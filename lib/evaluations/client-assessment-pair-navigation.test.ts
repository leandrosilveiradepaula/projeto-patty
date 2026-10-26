import assert from "node:assert/strict";
import test from "node:test";
import { clientAssessmentPairHref, clientAssessmentFromPairHref } from "./client-assessment-pair-navigation.ts";
import { selectFinalizedAssessmentPair, compareFinalizedAssessmentPair } from "./assessment-pair-comparison.ts";
import { completeClientAssessmentHistory } from "./client-assessment-history.ts";
import { buildFactualProgressSeries } from "./progress-view.ts";

const older = "11111111-1111-4111-8111-111111111111";
const newer = "22222222-2222-4222-8222-222222222222";
const draft = "33333333-3333-4333-8333-333333333333";
const foreign = "44444444-4444-4444-8444-444444444444";
const allowed = [newer, older];

test("only own finalized IDs produce a comparison URL", () => {
  const href = clientAssessmentPairHref({ referencia: older, comparacao: newer }, allowed);
  assert.ok(href);
  const parsed = new URL(href, "https://example.invalid");
  assert.equal(parsed.pathname, "/cliente/avaliacoes/comparar");
  assert.equal(parsed.searchParams.get("referencia"), older);
  assert.equal(parsed.searchParams.get("comparacao"), newer);
  assert.equal(parsed.hash, "#comparacao-resultados");
  for (const raw of [
    { referencia: foreign, comparacao: newer },
    { referencia: older, comparacao: draft },
    { referencia: newer, comparacao: newer },
    { referencia: [older], comparacao: newer },
    { referencia: older, comparacao: [newer] },
    { referencia: "not-a-uuid", comparacao: newer },
    { referencia: older },
    {},
  ]) assert.equal(clientAssessmentPairHref(raw, allowed), null);
});

test("exact assessment return links cannot target draft, foreign or third-party IDs", () => {
  const pair = selectFinalizedAssessmentPair({ referencia: older, comparacao: newer }, allowed)!;
  const href = clientAssessmentFromPairHref(older, pair, allowed);
  assert.equal(href, "/cliente/avaliacoes?avaliacao=" + older + "#avaliacao-" + older);
  assert.equal(clientAssessmentFromPairHref(foreign, pair, allowed), null);
  assert.equal(clientAssessmentFromPairHref(draft, pair, allowed), null);
  assert.equal(clientAssessmentFromPairHref(older, pair, [newer]), null);
  assert.equal(clientAssessmentFromPairHref(older, {referenceId:older,comparisonId:older}, allowed), null);
});

test("comparison of corrected, authorized data respects exact key and unit; missing stays missing", () => {
  const assessments = completeClientAssessmentHistory([
    { id: older, assessed_at: "2026-08-01T12:00:00Z", finalized_at: "2026-08-02T12:00:00Z" },
    { id: newer, assessed_at: "2026-09-01T12:00:00Z", finalized_at: "2026-09-02T12:00:00Z" },
    { id: draft, assessed_at: "2026-10-01T12:00:00Z", finalized_at: null },
  ], [
    { assessment_id: older, assessed_at: "2026-08-01T12:00:00Z", measurement_key: "peso", measurement_value: 71, unit: "kg" },
    { assessment_id: older, assessed_at: "2026-08-01T12:00:00Z", measurement_key: "cintura", measurement_value: 80, unit: "cm" },
    { assessment_id: newer, assessed_at: "2026-09-01T12:00:00Z", measurement_key: "peso", measurement_value: 69, unit: "kg" },
    { assessment_id: newer, assessed_at: "2026-09-01T12:00:00Z", measurement_key: "cintura", measurement_value: 800, unit: "mm" },
    { assessment_id: newer, assessed_at: "2026-09-01T12:00:00Z", measurement_key: "quadril", measurement_value: 100, unit: "cm" },
    { assessment_id: draft, assessed_at: "2026-10-01T12:00:00Z", measurement_key: "peso", measurement_value: 68, unit: "kg" },
  ]);
  assert.equal(assessments.some(a=>a.id===draft), false);
  const series = buildFactualProgressSeries(assessments);
  const rows = compareFinalizedAssessmentPair(series, older, newer);
  assert.equal(rows.find(r=>r.key==="peso")?.difference, -2);
  assert.equal(rows.find(r=>r.key==="quadril")?.reference, null);
  assert.equal(rows.find(r=>r.key==="quadril")?.difference, null);
  assert.equal(rows.find(r=>r.key==="cintura"&&r.unit==="cm")?.difference, null);
  assert.equal(rows.find(r=>r.key==="cintura"&&r.unit==="mm")?.difference, null);
});
