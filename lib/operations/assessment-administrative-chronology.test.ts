import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");
const all = read("app/admin/avaliacoes/page.tsx");
const client = read("app/admin/clientes/[clienteId]/avaliacoes/page.tsx");
const detail = read("app/admin/avaliacoes/[avaliacaoId]/page.tsx");
const progress = read("app/admin/clientes/[clienteId]/evolucao/page.tsx");
const library = read("lib/evaluations/administrative-assessment-history.ts");

test("global list maintains current authorization and sorts factual assessments after reading", () => {
  assert.ok(all.includes("listAccessibleClientAssessments()"));
  assert.ok(all.includes("orderAdministrativeAssessments(assessments)"));
  assert.ok(all.includes("orderedAssessments.map((assessment, index) =>"));
  assert.ok(all.includes("formatAdministrativeAssessmentDate(assessment.assessed_at)"));
  assert.ok(!all.includes("createAdminClient"));
});

test("same-date global assessments have distinct accessible link names with client and position", () => {
  assert.ok(all.includes("Ver avaliação ${index + 1} da lista"));
  assert.ok(all.includes("displayName"));
  assert.ok(all.includes('href={`/admin/avaliacoes/${assessment.id}`}'));
  assert.ok(all.includes("assessment.finalized_at"));
});

test("per-client chronological list separates drafts from finalizations without losing either", () => {
  assert.ok(client.includes("getAccessibleClient(clienteId)"));
  assert.ok(client.includes("listAccessibleAssessmentsForClient(client.id)"));
  assert.ok(client.includes("const orderedAssessments = orderAdministrativeAssessments(assessments)"));
  assert.ok(client.includes("draftAssessments = orderedAssessments.filter("));
  assert.ok(client.includes("finalizedAssessments = orderedAssessments.filter("));
  assert.ok(client.includes("!assessment.finalized_at"));
  assert.ok(client.includes("Boolean(assessment.finalized_at)"));
});

test("same-day draft and finalized links are distinguished without claiming a clinical version", () => {
  assert.ok(client.includes("draftAssessments.map((assessment, index) =>"));
  assert.ok(client.includes("finalizedAssessments.map((assessment, index) =>"));
  assert.ok(client.includes("Continuar avaliação ${index + 1} da lista de rascunhos"));
  assert.ok(client.includes("Ver avaliação ${index + 1} do histórico finalizado"));
  assert.ok(client.includes("formatAdministrativeAssessmentDate(assessment.assessed_at)"));
});

test("comparison uses the nearest older finalized record regardless of query order", () => {
  assert.ok(detail.includes("findPreviousFinalizedAssessment(assessment, clientAssessments)"));
  assert.ok(detail.includes("listAccessibleAssessmentsForClient(assessment.client_id)"));
  assert.ok(detail.includes("listAccessibleAssessmentMeasurements(previousAssessment.id)"));
  assert.ok(detail.includes("listAccessibleAssessmentMeasurementCorrections("));
  assert.ok(detail.includes("applyAssessmentMeasurementCorrections("));
  assert.ok(detail.includes("buildFactualMeasurementComparison("));
  assert.ok(!detail.includes("clientAssessments.find("));
});

test("comparison navigation remains on authorized historical assessment ID", () => {
  assert.ok(detail.includes('href={`/admin/avaliacoes/${previousAssessment.id}`}'));
  assert.ok(detail.includes("previousAssessment && factualComparison.length > 0"));
  assert.ok(detail.includes("formatAdministrativeAssessmentDate(previousAssessment.assessed_at)"));
  assert.ok(detail.includes("getAccessibleClientAssessment(avaliacaoId)"));
  assert.ok(detail.includes("notFound()"));
});

test("no synthetic comparison is made from same instant or drafts", () => {
  assert.ok(library.includes("at < currentInstant"));
  assert.ok(library.includes("Boolean(assessment.finalized_at)"));
  assert.ok(library.includes("assessment.id !== current.id"));
  assert.ok(library.includes("Number.isFinite(at)"));
  assert.ok(library.includes("if (!Number.isFinite(currentInstant)) return null"));
  assert.ok(!library.includes("autoAdvancePhase"));
});

test("administrative progress shares the same valid date presentation and source order", () => {
  assert.ok(progress.includes("orderAdministrativeAssessments("));
  assert.ok(progress.includes("listAccessibleAssessmentsForClient(client.id)"));
  assert.ok(progress.includes("Boolean(assessment.finalized_at)"));
  assert.ok(progress.includes("buildFactualProgressSeries(assessmentSnapshots)"));
  assert.ok(progress.includes("formatAdministrativeAssessmentDate(point.assessedAt)"));
  assert.ok(progress.includes("point.assessmentId"));
});

test("professional date formatting does not throw on invalid legacy assessment or follow-up dates", () => {
  assert.ok(library.includes('if (!Number.isFinite(Date.parse(value))) return "Data indisponível"'));
  assert.ok(detail.includes('if (!Number.isFinite(Date.parse(value))) return "Data indisponível"'));
  assert.ok(detail.includes("formatRecordDateTime(followUp.recorded_at)"));
  assert.ok(detail.includes("formatRecordDateTime(correction.created_at)"));
});

test("invalid legacy photo byte sizes are not displayed as negative, NaN or infinite KB", () => {
  assert.ok(detail.includes('Number.isSafeInteger(byteSize) && byteSize >= 0'));
  assert.ok(detail.includes('file.mime_type, file.byte_size'));
  assert.ok(detail.includes('src: `/admin/fotos/${file.id}`'));
  assert.ok(!detail.includes("getPublicUrl("));
});

test("the professional assessment lifecycle remains configured and human finalized", () => {
  assert.ok(detail.includes("loadSupportedAssessmentKindOptions()"));
  assert.ok(detail.includes("buildConfigurableAssessmentReadiness("));
  assert.ok(detail.includes("AssessmentFinalizeForm"));
  assert.ok(detail.includes("EvaluationProfessionalFollowUpForm"));
  assert.ok(detail.includes("listAccessibleAssessmentPhotoFiles(assessment.id)"));
  assert.ok(!library.includes("clinicalScore"));
});

test("the common comparison selector is read-only and independent of publication", () => {
  assert.ok(library.includes("return orderAdministrativeAssessments(older)[0] ?? null"));
  assert.ok(library.includes("newestFactualAssessments("));
  assert.ok(!library.includes("supabase"));
  assert.ok(!library.includes("service_role"));
  assert.ok(!library.includes("update("));
});
