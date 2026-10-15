import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  exploreReceivedWeeklyFeedbacks,
  readReceivedWeeklyFeedbackQuery,
  receivedWeeklyFeedbackInboxHref,
  receivedWeeklyFeedbackMonthBounds,
  RECEIVED_WEEKLY_FEEDBACK_PAGE_SIZE,
  type ReceivedWeeklyFeedbackHeader,
} from "./received-weekly-feedback-inbox.ts";

const header = (
  id: string,
  clientId: string,
  submittedAt: string | null,
  origin = "schedule",
  periodStart = "2026-10-05",
): ReceivedWeeklyFeedbackHeader => ({
  id,
  client_id: clientId,
  period_start: periodStart,
  period_end: "2026-10-11",
  request_source: origin,
  submitted_at: submittedAt,
});

test("a selected client must belong to the professional's current assignments", () => {
  const valid = readReceivedWeeklyFeedbackQuery({
    cliente: "assigned-1", origem: "manual", mes: "2026-10", pagina: "2",
  }, ["assigned-1"]);
  assert.deepEqual(valid, {
    clientId: "assigned-1", origin: "manual", month: "2026-10", page: 2, invalid: false,
  });
  const unknown = readReceivedWeeklyFeedbackQuery({ cliente: "another-client" }, ["assigned-1"]);
  assert.equal(unknown.invalid, true);
  assert.equal(unknown.clientId, "all");
  const rows = [header("own", "assigned-1", "2026-10-15T13:00:00Z"),
    header("other", "another-client", "2026-10-15T14:00:00Z")];
  assert.deepEqual(exploreReceivedWeeklyFeedbacks(rows, unknown, ["assigned-1"]).items, []);
  assert.deepEqual(exploreReceivedWeeklyFeedbacks(
    rows, readReceivedWeeklyFeedbackQuery({}, ["assigned-1"]), ["assigned-1"],
  ).items.map(row => row.id), ["own"]);
});

test("filters reject ambiguous, malformed, and unsupported query values", () => {
  assert.equal(readReceivedWeeklyFeedbackQuery({ cliente: ["assigned-1"] }, ["assigned-1"]).invalid, true);
  assert.equal(readReceivedWeeklyFeedbackQuery({ origem: "unknown" }, ["assigned-1"]).invalid, true);
  assert.equal(readReceivedWeeklyFeedbackQuery({ mes: "2026-13" }, ["assigned-1"]).invalid, true);
  assert.equal(readReceivedWeeklyFeedbackQuery({ mes: ["2026-10"] }, ["assigned-1"]).invalid, true);
  assert.equal(readReceivedWeeklyFeedbackQuery({ pagina: "0002" }, ["assigned-1"]).invalid, true);
  assert.equal(readReceivedWeeklyFeedbackQuery({ pagina: "9999999" }, ["assigned-1"]).invalid, true);
  assert.equal(readReceivedWeeklyFeedbackQuery({ mes: "" }, ["assigned-1"]).invalid, false);
});

test("only actual submitted records matching source and reference month appear", () => {
  const rows = [
    header("manual-oct", "assigned-1", "2026-10-15T12:00:00Z", "manual"),
    header("scheduled-oct", "assigned-1", "2026-10-15T13:00:00Z", "schedule"),
    header("manual-sept", "assigned-1", "2026-10-10T13:00:00Z", "manual", "2026-09-28"),
    header("draft", "assigned-1", null, "manual"),
    header("not-assigned", "unknown", "2026-10-15T14:00:00Z", "manual"),
  ];
  const options = readReceivedWeeklyFeedbackQuery({ origem: "manual", mes: "2026-10" }, ["assigned-1"]);
  const output = exploreReceivedWeeklyFeedbacks(rows, options, ["assigned-1"]);
  assert.equal(output.total, 1);
  assert.deepEqual(output.items.map(row => row.id), ["manual-oct"]);
  assert.equal(rows.length, 5);
});

test("received history paginates oldest and newest data without truncating older records", () => {
  const rows = Array.from({ length: 34 }, (_, index) =>
    header(`item-${index}`, "assigned-1", new Date(Date.UTC(2026, 9, 15, 0, index)).toISOString()));
  const options = readReceivedWeeklyFeedbackQuery({ pagina: "3" }, ["assigned-1"]);
  const result = exploreReceivedWeeklyFeedbacks(rows, options, ["assigned-1"]);
  assert.equal(RECEIVED_WEEKLY_FEEDBACK_PAGE_SIZE, 15);
  assert.deepEqual([result.page, result.pages, result.total, result.first, result.last, result.items.length],
    [3, 3, 34, 31, 34, 4]);
  assert.equal(result.items[0].id, "item-3");
  const tooFar = exploreReceivedWeeklyFeedbacks(
    rows, readReceivedWeeklyFeedbackQuery({pagina: "999"}, ["assigned-1"]), ["assigned-1"]);
  assert.equal(tooFar.adjusted, true);
  assert.equal(tooFar.page, 3);
});

test("receipt sorting uses real instant and stable id tie-break, not ISO text or reference period", () => {
  const rows = [
    header("a", "assigned", "2026-10-15T13:00:00+01:00"),
    header("b", "assigned", "2026-10-15T09:00:00-03:00"),
    header("older", "assigned", "2026-10-15T11:00:00Z"),
  ];
  const result = exploreReceivedWeeklyFeedbacks(
    rows, readReceivedWeeklyFeedbackQuery({}, ["assigned"]), ["assigned"]);
  assert.deepEqual(result.items.map(row => row.id), ["b", "a", "older"]);
});

test("calendar month bounds include leap days and preserve December rollover", () => {
  assert.deepEqual(receivedWeeklyFeedbackMonthBounds("2024-02"),
    {first:"2024-02-01",last:"2024-02-29"});
  assert.deepEqual(receivedWeeklyFeedbackMonthBounds("2025-02"),
    {first:"2025-02-01",last:"2025-02-28"});
  assert.deepEqual(receivedWeeklyFeedbackMonthBounds("2026-12"),
    {first:"2026-12-01",last:"2026-12-31"});
  assert.equal(receivedWeeklyFeedbackMonthBounds("2026-00"), null);
});

test("inbox pagination preserves only validated client, origin and month filters", () => {
  const options = readReceivedWeeklyFeedbackQuery(
    { cliente: "client-1", origem: "manual", mes: "2026-10" }, ["client-1"]);
  assert.equal(receivedWeeklyFeedbackInboxHref(options, 2),
    "/admin/feedback-semanal?cliente=client-1&origem=manual&mes=2026-10&pagina=2#recebidos");
  assert.equal(receivedWeeklyFeedbackInboxHref(
    readReceivedWeeklyFeedbackQuery({}, []), 1), "/admin/feedback-semanal#recebidos");
});

test("admin inbox reads only authorized headers and links to the original response", () => {
  const loader = readFileSync(new URL("./received-weekly-feedback-loader.ts", import.meta.url), "utf8");
  const page = readFileSync(new URL("../../app/admin/feedback-semanal/page.tsx", import.meta.url), "utf8");
  const dashboard = readFileSync(new URL("../../app/admin/page.tsx", import.meta.url), "utf8");
  const sidebar = readFileSync(new URL("../../components/layout/AdminSidebar.tsx", import.meta.url), "utf8");

  assert.match(loader, /createClient\(\)/);
  assert.match(loader, /collectScopedClientOperationalRows\(clientIds/);
  assert.match(loader, /\.select\("id, client_id, period_start, period_end, request_source, submitted_at"\)/);
  assert.match(loader, /\.not\("submitted_at", "is", null\)/);
  assert.doesNotMatch(loader, /createAdminClient|service_role|\.select\([^)]*answers/);
  assert.match(page, /filters\.invalid \? \[\]/);
  assert.match(page, /listClientsAssignedToCurrentAdmin\(\)/);
  assert.match(page, /receivedWeeklyFeedbackExactHref\(feedback\)/);
  assert.match(page, /recebimento, não leitura, revisão nem decisão profissional/);
  assert.match(dashboard, /href="\/admin\/feedback-semanal"/);
  assert.match(sidebar, /href: "\/admin\/feedback-semanal"/);
});
