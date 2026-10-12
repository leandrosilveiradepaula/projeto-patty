import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (p: string) => readFileSync(new URL("../../" + p, import.meta.url), "utf8");
const access = read("lib/supabase/data-access.ts");
const adminList = read("app/admin/clientes/[clienteId]/anamnese/page.tsx");
const reviewPage = read("app/admin/anamneses/[anamneseId]/revisao/page.tsx");
const answersPage = read("app/admin/anamneses/[anamneseId]/page.tsx");
const clientList = read("app/cliente/anamnese/page.tsx");
const reviewCss = read("app/admin/anamneses/[anamneseId]/revisao/page.module.css");

const fn = (name: string) => {
  const begin = access.indexOf("export async function " + name + "(");
  const end = access.indexOf("\nexport async function ", begin + 10);
  assert.ok(begin >= 0, name);
  return access.slice(begin, end < 0 ? undefined : end);
};

test("individual professional reviews load every page with authorized submission ID", () => {
  const source = fn("listAccessibleAnamnesisReviews");
  assert.ok(source.includes("createClient()"));
  assert.ok(source.includes("collectAnamnesisHistoryRows([submissionId]"));
  assert.ok(source.includes('.in("submission_id", ids)'));
  assert.ok(source.includes(".range(from, to)"));
  assert.ok(source.includes("compareAnamnesisReviewChronology"));
  assert.ok(!source.includes("createAdminClient"));
  assert.ok(!source.includes("service_role"));
});

test("batch professional reviews are paginated, globally ordered and fail closed", () => {
  const source = fn("listAccessibleAnamnesisReviewsForSubmissions");
  assert.ok(source.includes("if (submissionIds.length === 0) return []"));
  assert.ok(source.includes("collectAnamnesisHistoryRows(submissionIds"));
  assert.ok(source.includes('.in("submission_id", ids)'));
  assert.ok(source.includes(".range(from, to)"));
  assert.ok(source.includes("left.submission_id.localeCompare(right.submission_id)"));
  assert.ok(source.includes("compareAnamnesisReviewChronology(left, right)"));
  assert.ok(!source.includes("createAdminClient"));
});

test("both review queries return original note, professional actor and timestamp for audit", () => {
  for (const name of [
    "listAccessibleAnamnesisReviews",
    "listAccessibleAnamnesisReviewsForSubmissions",
  ]) {
    const source = fn(name);
    assert.ok(source.includes("reviewer_profile_id, note, created_at, profiles(display_name)"), name);
    assert.ok(source.includes('from("anamnesis_reviews")'), name);
    assert.ok(source.includes('.order("id", { ascending: true })'), name);
  }
});

test("professional Anamnesis history displays factual counts and latest private note", () => {
  assert.ok(adminList.includes("summarizeAnamnesisReviewHistory(reviews)"));
  assert.ok(adminList.includes("reviewSummaries.get(submission.id)"));
  assert.ok(adminList.includes("reviewedSubmissionIds.has(submission.id)"));
  assert.ok(adminList.includes("reviewSummary?.count"));
  assert.ok(adminList.includes("reviewSummary.latest.id"));
  assert.ok(adminList.includes("formatDateTime(reviewSummary.latest.created_at)"));
  assert.ok(adminList.includes('Ainda não registrada'));
  assert.ok(adminList.includes("Esta submissão ainda não possui nota"));
});

test("links navigate to one exact note without putting its text in the URL", () => {
  assert.ok(adminList.includes('/revisao#revisao-${reviewSummary.latest.id}'));
  assert.ok(reviewPage.includes('id={`revisao-${review.id}`}'));
  assert.ok(reviewPage.includes('href={`#revisao-${latestReview.id}`}'));
  assert.ok(reviewPage.includes("Ir para a nota mais recente"));
  assert.ok(reviewCss.includes(".items > li:target .reviewCard"));
  assert.ok(reviewCss.includes(".historyNavigation a:focus-visible"));
  assert.ok(reviewCss.includes("min-height: 44px"));
  assert.ok(!adminList.includes("review.note"));
});

test("professional detail never exposes internal notes in the original answer workspace", () => {
  assert.ok(!answersPage.includes("listAccessibleAnamnesisReviews("));
  assert.ok(!answersPage.includes("review.note"));
  assert.ok(answersPage.includes("listAccessibleAnamnesisAnswers(submission.id)"));
  assert.ok(answersPage.includes('href={`/admin/clientes/${submission.client_id}/arquivos`}'));
});

test("client Anamnesis history stays independent of internal professional notes", () => {
  assert.ok(clientList.includes("listAccessibleAnamnesisSubmissions(client.id)"));
  assert.ok(!clientList.includes("listAccessibleAnamnesisReviews"));
  assert.ok(!clientList.includes("reviewSummary.latest"));
  assert.ok(!clientList.includes("reviewer_profile_id"));
  assert.ok(reviewPage.includes("Estas notas são registros profissionais append-only."));
  assert.ok(reviewPage.includes("não são exibidas para ela."));
});

test("review detail remains immutable and protected by exact authorized submission", () => {
  assert.ok(reviewPage.includes("getAccessibleAnamnesisSubmission(anamneseId)"));
  assert.ok(reviewPage.includes("listAccessibleAnamnesisReviews(submission.id)"));
  assert.ok(reviewPage.includes("AdminAnamnesisReviewForm"));
  assert.ok(!reviewPage.includes("deleteAccessibleAnamnesisReview"));
  assert.ok(!reviewPage.includes("updateAccessibleAnamnesisReview"));
});

test("legacy malformed dates use neutral fallback on all relevant Anamnesis screens", () => {
  for (const source of [adminList, reviewPage, clientList, answersPage]) {
    assert.ok(source.includes('if (!Number.isFinite(Date.parse(value))) return "Data indisponível"'));
    assert.ok(source.includes('timeZone: "America/Sao_Paulo"'));
  }
});

test("administrative review statuses remain separate from client clarifications and AI", () => {
  assert.ok(adminList.includes("loadClientClarificationSummary(submittedIds)"));
  assert.ok(adminList.includes("awaitingClient = clarification?.awaitingClient ?? 0"));
  assert.ok(adminList.includes("awaitingProfessional = clarification?.awaitingProfessional ?? 0"));
  assert.ok(!adminList.includes("autoPublish"));
  assert.ok(!reviewPage.includes("publishAnamnesisAnalysis"));
  assert.ok(!reviewPage.includes("createClinicalDiagnosis"));
});
