import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  previousSubmittedFeedbackByPeriod,
  selectAuthorizedSubmittedFeedbackPair,
  weeklyFeedbackComparisonHref,
} from "./weekly-feedback-comparison.ts";

type Fact = {
  id: string;
  client_id: string;
  period_start: string;
  created_at: string;
  submitted_at: string | null;
};

const fact = (
  id: string, clientId: string, period: string, submittedAt: string | null,
  createdAt = "2026-10-15T08:00:00Z",
): Fact => ({ id, client_id: clientId, period_start: period, submitted_at: submittedAt, created_at: createdAt });

const client = "client-a";

test("comparison picks previous submitted reference period, not submission time or pending draft", () => {
  const records = [
    fact("newest-period", client, "2026-10-13", "2026-10-15T07:00:00Z"),
    fact("pending-middle", client, "2026-10-06", null),
    fact("previous-period", client, "2026-09-29", "2026-10-15T10:00:00Z"),
    fact("old-period", client, "2026-09-22", "2026-10-15T12:00:00Z"),
    fact("another-client", "client-b", "2026-10-06", "2026-10-15T09:00:00Z"),
  ];
  assert.equal(previousSubmittedFeedbackByPeriod(records, "newest-period")?.id, "previous-period");
  assert.equal(previousSubmittedFeedbackByPeriod(records, "pending-middle"), null);
  assert.equal(previousSubmittedFeedbackByPeriod(records, "old-period"), null);
  assert.equal(previousSubmittedFeedbackByPeriod(records, "nonexistent"), null);
  assert.equal(records[0].id, "newest-period");
});

test("same-period manual and scheduled records are not falsely described as preceding weeks", () => {
  const rows = [
    fact("current", client, "2026-10-13", "2026-10-15T09:00:00Z", "2026-10-15T09:01:00Z"),
    fact("duplicate-start", client, "2026-10-13", "2026-10-15T08:00:00Z", "2026-10-15T08:01:00Z"),
    fact("older", client, "2026-10-06", "2026-10-15T06:00:00Z"),
  ];
  assert.equal(previousSubmittedFeedbackByPeriod(rows, "current")?.id, "older");
  assert.equal(previousSubmittedFeedbackByPeriod(rows, "duplicate-start")?.id, "older");
});

test("pair authorization rejects other-client data, missing rows, pending and reversed periods", () => {
  const current = fact("current", client, "2026-10-13", "2026-10-15T09:00:00Z");
  const previous = fact("previous", client, "2026-10-06", "2026-10-15T08:00:00Z");
  const result = selectAuthorizedSubmittedFeedbackPair([current, previous], client, current.id, previous.id);
  assert.deepEqual(result, { current, previous });
  assert.equal(selectAuthorizedSubmittedFeedbackPair([current, previous], client, current.id, current.id), null);
  assert.equal(selectAuthorizedSubmittedFeedbackPair([current], client, current.id, previous.id), null);
  assert.equal(selectAuthorizedSubmittedFeedbackPair([current, previous], client, previous.id, current.id), null);
  assert.equal(selectAuthorizedSubmittedFeedbackPair(
    [current, { ...previous, client_id: "unassigned-client" }], client, current.id, previous.id), null);
  assert.equal(selectAuthorizedSubmittedFeedbackPair(
    [current, { ...previous, submitted_at: null }], client, current.id, previous.id), null);
  assert.equal(selectAuthorizedSubmittedFeedbackPair([current, previous], "unassigned-client", current.id, previous.id), null);
});

test("comparison deep link contains only client and record identifiers", () => {
  const url = weeklyFeedbackComparisonHref("client-1", "current-1", "previous-1");
  assert.equal(url,
    "/admin/clientes/client-1/feedback-semanal/comparar?atual=current-1&anterior=previous-1");
  assert.ok(!url.includes("respostas"));
  assert.ok(!url.includes("answers"));
});

const read = (path: string) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");

test("comparison uses authenticated client RLS for an exact two-record read", () => {
  const source = read("lib/supabase/data-access.ts");
  const start = source.indexOf("export async function listAccessibleSubmittedWeeklyFeedbackPair(");
  const body = source.slice(start);
  assert.ok(start >= 0);
  assert.match(body, /createClient\(\)/);
  assert.match(body, /\.from\("client_weekly_feedbacks"\)/);
  assert.match(body, /\.eq\("client_id", clientId\)/);
  assert.match(body, /\.in\("id", \[\.\.\.feedbackIds\]\)/);
  assert.match(body, /\.not\("submitted_at", "is", null\)/);
  assert.match(body, /\.limit\(2\)/);
  assert.doesNotMatch(body, /createAdminClient|service_role|\.filter\("answers"/);
});

test("route verifies both UUIDs and same-client submitted records before showing health answers", () => {
  const page = read("app/admin/clientes/[clienteId]/feedback-semanal/comparar/page.tsx");
  assert.match(page, /isUuid\(clienteId\)/);
  assert.match(page, /isUuid\(requested\.atual\)/);
  assert.match(page, /isUuid\(requested\.anterior\)/);
  assert.match(page, /getAccessibleClient\(clienteId\)/);
  assert.match(page, /listAccessibleSubmittedWeeklyFeedbackPair\(/);
  assert.match(page, /selectAuthorizedSubmittedFeedbackPair\(/);
  assert.match(page, /if \(!pair\) notFound\(\)/);
  assert.match(page, /parseWeeklyFeedbackDefinition\(/);
  assert.match(page, /sameVersion \?/);
  assert.match(page, /Questionários de versões diferentes/);
  assert.match(page, /Sem resposta registrada/);
  assert.match(page, /Não é análise de IA, nota automática de adesão/);
  assert.doesNotMatch(page, /createAdminClient|service_role|\.update\(|\.insert\(|\.delete\(/);
});

test("professional history offers side-by-side consultation only for a submitted prior period", () => {
  const page = read("app/admin/clientes/[clienteId]/feedback-semanal/page.tsx");
  assert.match(page, /previousSubmittedFeedbackByPeriod\(orderedFeedbacks, feedback\.id\)/);
  assert.match(page, /comparisonPrevious \? \(/);
  assert.match(page, /weeklyFeedbackComparisonHref\(client\.id, feedback\.id, comparisonPrevious\.id\)/);
  assert.match(page, /Comparar com o Feedback Semanal de período anterior/);
});

test("same-version comparison is explicitly factual, with no automated adherence", () => {
  const page = read("app/admin/clientes/[clienteId]/feedback-semanal/comparar/page.tsx");
  assert.match(page, /compareSameVersionWeeklyFeedbackAnswers\(/);
  assert.match(page, /questionário versionado/);
  assert.match(page, /Somente respostas diferentes/);
  assert.match(page, /Todas as respostas/);
  assert.match(page, /data-comparison-answer="true"/);
  assert.match(page, /answerView\.view !== "diferentes" \|\| row\.different/);
  assert.doesNotMatch(page, /scoreAdesao|computedAdherence|autoAdvanceProtocol/);
});
