import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  latestSubmittedWeeklyFeedbacks,
  receivedWeeklyFeedbackExactHref,
  WEEKLY_FEEDBACK_RECEIPT_CLIENT_BATCH_SIZE,
  WEEKLY_FEEDBACK_RECEIPT_PREVIEW_LIMIT,
  type WeeklyFeedbackReceiptHeader,
} from "./recent-weekly-feedbacks.ts";

const receipt = (id: string, clientId: string, submittedAt: string | null): WeeklyFeedbackReceiptHeader => ({
  id, client_id: clientId, period_start: "2026-10-05", period_end: "2026-10-11",
  submitted_at: submittedAt,
});

test("admin overview shows only real submitted records of currently assigned clients", () => {
  const rows = [
    receipt("submitted-own", "own", "2026-10-15T12:00:00Z"),
    receipt("draft-own", "own", null),
    receipt("submitted-other", "other", "2026-10-15T13:00:00Z"),
    receipt("invalid-legacy", "own", "not-a-timestamp"),
    receipt("submitted-another", "assigned-two", "2026-10-15T11:00:00Z"),
  ];
  assert.deepEqual(
    latestSubmittedWeeklyFeedbacks(rows, ["own", "assigned-two"]).map(row => row.id),
    ["submitted-own", "submitted-another"],
  );
  assert.equal(rows[0].submitted_at, "2026-10-15T12:00:00Z");
  assert.deepEqual(latestSubmittedWeeklyFeedbacks(rows, []), []);
  assert.deepEqual(latestSubmittedWeeklyFeedbacks(rows, ["own"], 0), []);
});

test("latest five are ordered by submission instant across offsets, not period date", () => {
  const rows = Array.from({length: 8}, (_, i) =>
    receipt(`feedback-${i}`, "own", `2026-10-15T${String(i+1).padStart(2,"0")}:00:00Z`));
  rows.push(receipt("same-instant-a", "own", "2026-10-15T09:00:00+00:00"));
  rows.push(receipt("same-instant-b", "own", "2026-10-15T06:00:00-03:00"));
  assert.equal(WEEKLY_FEEDBACK_RECEIPT_PREVIEW_LIMIT, 5);
  assert.equal(WEEKLY_FEEDBACK_RECEIPT_CLIENT_BATCH_SIZE, 100);
  assert.deepEqual(latestSubmittedWeeklyFeedbacks(rows, ["own"]).map(row => row.id),
    ["same-instant-b", "same-instant-a", "feedback-7", "feedback-6", "feedback-5"]);
});

test("exact submission link opens admin history for the precise authorized record", () => {
  assert.equal(
    receivedWeeklyFeedbackExactHref(receipt("feedback-1", "client-1", "2026-10-15T12:00:00Z")),
    "/admin/clientes/client-1/feedback-semanal?registro=feedback-1#feedback-enviado-feedback-1",
  );
});

test("loader uses authenticated RLS, bounded batches and metadata-only SQL", () => {
  const loader = readFileSync(new URL("./recent-weekly-feedback-loader.ts", import.meta.url), "utf8");
  const dashboard = readFileSync(new URL("../../app/admin/page.tsx", import.meta.url), "utf8");
  assert.match(loader, /createClient\(\)/);
  assert.match(loader, /\.select\("id, client_id, period_start, period_end, submitted_at"\)/);
  assert.match(loader, /\.not\("submitted_at", "is", null\)/);
  assert.match(loader, /\.limit\(WEEKLY_FEEDBACK_RECEIPT_PREVIEW_LIMIT\)/);
  assert.match(loader, /if \(error\) throw error/);
  assert.doesNotMatch(loader, /createAdminClient|service_role|\.select\([^)]*answers/);
  assert.match(dashboard, /listRecentSubmittedWeeklyFeedbacksForClients\(assignedClientIds\)/);
  assert.match(dashboard, /receivedWeeklyFeedbackExactHref\(feedback\)/);
  assert.doesNotMatch(dashboard, /Não lido|Não revisado/);
});
