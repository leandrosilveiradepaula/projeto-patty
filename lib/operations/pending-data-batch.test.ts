import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (p: string) => readFileSync(new URL("../../" + p, import.meta.url), "utf8");

test("admin queue reads assigned facts in batches, never per client or protocol", () => {
  const source = read("lib/operations/pending-data.ts");
  for (const fn of [
    "listPendingAnamnesisSubmissionsForClients",
    "listPendingWeeklyFeedbacksForClients",
    "listPendingNotificationEventsForClients",
    "listPendingAnamnesisReviewsForSubmissions",
    "listPendingClarificationRequestsForSubmissions",
    "listPendingProtocolVersionsForProtocols",
  ]) {
    assert.match(source, new RegExp(fn + "\\("), fn);
  }
  assert.doesNotMatch(source, /assignedClients\.map\(\(client\)\s*=>\s*listAccessibleAnamnesisSubmissions/);
  assert.doesNotMatch(source, /assignedClients\.map\(\(client\)\s*=>\s*listAccessibleWeeklyFeedbacksForClient/);
  assert.doesNotMatch(source, /submitted\.map\(async \(submission\)/);
  assert.doesNotMatch(source, /protocols\.map\(async \(protocol\)/);
  assert.match(source, /reviewsBySubmission\.set/);
  assert.match(source, /protocolsById\.get\(version\.protocol_id\)/);
  assert.match(source, /submittedById\.get\(request\.submission_id\)/);
});

test("queue loaders project minimal fields under authenticated RLS with scoped and paginated queries", () => {
  const source = read("lib/operations/pending-facts.ts");
  const pagination = read("lib/operations/pending-pagination.ts");
  for (const table of [
    "anamnesis_submissions",
    "client_weekly_feedbacks",
    "client_notification_events",
    "anamnesis_reviews",
    "anamnesis_clarification_requests",
    "protocol_versions",
  ]) {
    assert.match(source, new RegExp('from\\("' + table + '"\\)'));
  }
  assert.match(source, /createClient/);
  assert.doesNotMatch(source, /createAdminClient|SUPABASE_SECRET|service_role/);
  assert.equal((source.match(/\.range\(from, to\)/g) ?? []).length, 6);
  assert.equal((source.match(/\.in\("/g) ?? []).length, 6);
  assert.match(pagination, /new Set\(ids\)/);
  assert.match(pagination, /if \(error\) throw error/);
});
