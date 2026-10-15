import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  explorePendingWeeklyFeedbacks,
  pendingWeeklyFeedbackExactHref,
  readWeeklyFeedbackInboxSituation,
  weeklyFeedbackOriginLabel,
  weeklyFeedbackPendingInboxHref,
  type PendingWeeklyFeedbackHeader,
} from "./pending-weekly-feedback-inbox.ts";
import { readReceivedWeeklyFeedbackQuery } from "./received-weekly-feedback-inbox.ts";

function request(id: string, clientId: string, submittedAt: string | null = null,
  origin = "schedule", periodStart = "2026-10-05", createdAt = "2026-10-12T09:00:00Z"): PendingWeeklyFeedbackHeader {
  return {
    id, client_id: clientId, submitted_at: submittedAt,
    request_source: origin, period_start: periodStart, period_end: "2026-10-11",
    created_at: createdAt, due_at: null,
  };
}

test("default remains received; only explicit pending is accepted", () => {
  assert.deepEqual(readWeeklyFeedbackInboxSituation(undefined),
    { situation: "recebidos", invalid: false });
  assert.deepEqual(readWeeklyFeedbackInboxSituation("recebidos"),
    { situation: "recebidos", invalid: false });
  assert.deepEqual(readWeeklyFeedbackInboxSituation("pendentes"),
    { situation: "pendentes", invalid: false });
  for (const invalid of [null, "", "all", "submitted", "pendente", ["pendentes"], ["recebidos"], 0]) {
    assert.equal(readWeeklyFeedbackInboxSituation(invalid).invalid, true);
  }
});

test("only still-pending requests for currently assigned clients appear", () => {
  const rows = [
    request("pending-own", "own"),
    request("submitted-own", "own", "2026-10-15T12:00:00Z"),
    request("pending-other", "other"),
    request("pending-another-assigned", "assigned-two"),
    request("manual-own", "own", null, "manual"),
  ];
  const filters = readReceivedWeeklyFeedbackQuery({ origem: "schedule" }, ["own", "assigned-two"]);
  const result = explorePendingWeeklyFeedbacks(rows, filters, ["own", "assigned-two"]);
  assert.deepEqual(result.items.map(row => row.id), ["pending-another-assigned", "pending-own"]);
  assert.equal(result.total, 2);
  assert.equal(rows.length, 5);
  assert.equal(rows[0].submitted_at, null);
});

test("invalid or out-of-scope client filter fails closed", () => {
  const rows = [request("own", "own"), request("other", "other")];
  const badClient = readReceivedWeeklyFeedbackQuery({ cliente: "other" }, ["own"]);
  assert.equal(badClient.invalid, true);
  assert.equal(explorePendingWeeklyFeedbacks(rows, badClient, ["own"]).total, 0);
  const malformed = readReceivedWeeklyFeedbackQuery({ mes: ["2026-10"] }, ["own"]);
  assert.equal(explorePendingWeeklyFeedbacks(rows, malformed, ["own"]).total, 0);
  assert.equal(explorePendingWeeklyFeedbacks(rows, readReceivedWeeklyFeedbackQuery({}, []), []).total, 0);
});

test("pending filters use start of reference period, never receipt timestamp", () => {
  const rows = [
    request("oct-manual", "own", null, "manual", "2026-10-05"),
    request("sep-manual", "own", null, "manual", "2026-09-28", "2026-10-15T10:00:00Z"),
    request("oct-scheduled", "own", null, "schedule", "2026-10-05"),
  ];
  const filters = readReceivedWeeklyFeedbackQuery({ mes: "2026-10", origem: "manual" }, ["own"]);
  assert.deepEqual(explorePendingWeeklyFeedbacks(rows, filters, ["own"]).items.map(x=>x.id), ["oct-manual"]);
});

test("pending list orders periods and pages without losing older requests", () => {
  const rows = Array.from({ length: 34 }, (_, i) =>
    request("week-" + i, "own", null, "schedule", "2026-10-05",
      new Date(Date.UTC(2026, 9, 15, 0, i)).toISOString()));
  const filters = readReceivedWeeklyFeedbackQuery({ pagina: "3" }, ["own"]);
  const third = explorePendingWeeklyFeedbacks(rows, filters, ["own"]);
  assert.deepEqual([third.page, third.pages, third.total, third.first, third.last, third.items.length],
    [3, 3, 34, 31, 34, 4]);
  assert.equal(third.items[0].id, "week-3");
  const oversized = explorePendingWeeklyFeedbacks(rows,
    readReceivedWeeklyFeedbackQuery({ pagina: "999" }, ["own"]), ["own"]);
  assert.equal(oversized.adjusted, true);
  assert.equal(oversized.page, 3);
});

test("pending sort chooses later reference periods before late-created old periods", () => {
  const rows = [
    request("old-created-late", "own", null, "schedule", "2026-09-28", "2026-10-16T10:00:00Z"),
    request("new", "own", null, "schedule", "2026-10-05", "2026-10-15T10:00:00Z"),
  ];
  const result = explorePendingWeeklyFeedbacks(rows, readReceivedWeeklyFeedbackQuery({}, ["own"]), ["own"]);
  assert.deepEqual(result.items.map(x => x.id), ["new", "old-created-late"]);
});

test("pending links preserve filters, contain identifiers only, and never imply a client answered", () => {
  const filters = readReceivedWeeklyFeedbackQuery(
    { cliente: "own", origem: "manual", mes: "2026-10" }, ["own"]);
  assert.equal(weeklyFeedbackPendingInboxHref(filters, 2),
    "/admin/feedback-semanal?situacao=pendentes&cliente=own&origem=manual&mes=2026-10&pagina=2#aguardando-cliente");
  assert.equal(weeklyFeedbackPendingInboxHref(readReceivedWeeklyFeedbackQuery({}, []), 1),
    "/admin/feedback-semanal?situacao=pendentes#aguardando-cliente");
  const link = pendingWeeklyFeedbackExactHref(request("feedback-1", "client-1"));
  assert.equal(link, "/admin/clientes/client-1/feedback-semanal?registro=feedback-1");
  assert.doesNotMatch(link, /answers|respostas|health|sent|submitted/);
});

test("origin labels do not misclassify legacy unknown origins as manual", () => {
  assert.equal(weeklyFeedbackOriginLabel("manual"), "Manual");
  assert.equal(weeklyFeedbackOriginLabel("schedule"), "Agendada");
  assert.equal(weeklyFeedbackOriginLabel("unexpected"), "Origem não identificada");
});

test("consolidated inbox uses authenticated RLS metadata-only reads and never displays drafts", () => {
  const read = (p: string) => readFileSync(new URL("../../" + p, import.meta.url), "utf8");
  const page = read("app/admin/feedback-semanal/page.tsx");
  const loader = read("lib/follow-up/pending-weekly-feedback-loader.ts");
  const detail = read("app/admin/clientes/[clienteId]/feedback-semanal/page.tsx");
  assert.match(loader, /createClient\(\)/);
  assert.match(loader, /collectScopedClientOperationalRows\(clientIds/);
  assert.match(loader, /\.select\("id, client_id, period_start, period_end, request_source, submitted_at, created_at, due_at"\)/);
  assert.match(loader, /\.in\("client_id", ids\)/);
  assert.match(loader, /\.is\("submitted_at", null\)/);
  assert.doesNotMatch(loader, /service_role|createAdminClient|\.select\([^)]*answers/);
  assert.match(page, /const selectedIds = filters.invalid \? \[\] : situation.invalid \? \[\]/);
  assert.match(page, /listPendingWeeklyFeedbackHeadersForClients\(selectedIds, filters\)/);
  assert.match(page, /listReceivedWeeklyFeedbackHeadersForClients\(selectedIds, filters\)/);
  assert.match(page, /pendingWeeklyFeedbackExactHref\(feedback\)/);
  assert.match(page, /receivedWeeklyFeedbackExactHref\(feedback\)/);
  assert.match(page, /Não mostra rascunhos nem aplica consequências automáticas/);
  assert.match(detail, /authorizedExactRecordPage\(/);
});
