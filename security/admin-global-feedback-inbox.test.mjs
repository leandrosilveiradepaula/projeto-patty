import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync("app/admin/feedback-semanal/page.tsx", "utf8");
const access = readFileSync("lib/supabase/data-access.ts", "utf8");
const headers = readFileSync("lib/follow-up/received-weekly-feedback-loader.ts", "utf8");
const pending = readFileSync("lib/follow-up/pending-weekly-feedback-loader.ts", "utf8");
const events = readFileSync("lib/follow-up/pending-weekly-feedback-reminder-loader.ts", "utf8");
const globalRead = access.slice(
  access.indexOf("export async function listAllClientsForCurrentAdmin("),
  access.indexOf("export async function listClientsAssignedToCurrentAdmin("),
);

test("global admin feedback inbox uses server verified role and RLS, not service role or assignments", () => {
  assert.match(page, /listAllClientsForCurrentAdmin\(\)/);
  assert.doesNotMatch(page, /listClientsAssignedToCurrentAdmin|createAdminClient|client_assignments/);
  assert.match(globalRead, /requireRole\("admin"\)/);
  assert.match(globalRead, /createClient\(\)/);
  assert.match(globalRead, /\.from\("clients"\)/);
  assert.doesNotMatch(globalRead, /createAdminClient/);
  for (const source of [headers, pending, events]) {
    assert.match(source, /await createClient\(\)/);
    assert.doesNotMatch(source, /createAdminClient|service_role|client_assignments/);
  }
});

test("inbox never queries health answers or sends reminders; selected IDs remain validated", () => {
  assert.match(page, /readReceivedWeeklyFeedbackQuery\(rawQuery, clientIds\)/);
  assert.match(page, /filters\.invalid \? \[\] : situation\.invalid \? \[\] :/);
  assert.match(page, /selectedIds\.length && !isPending/);
  assert.match(page, /selectedIds\.length && isPending/);
  assert.match(page, /isPending && !invalidSelection/);
  assert.match(headers, /\.select\("id, client_id, period_start, period_end, request_source, submitted_at"\)/);
  assert.match(pending, /\.select\("id, client_id, period_start, period_end, request_source, submitted_at, created_at, due_at"\)/);
  assert.doesNotMatch(headers + pending + events, /\.select\([^)]*\banswers\b|createSignedUrl|\.insert\(|\.update\(|\.delete\(|sendEmail|dispatchReminder/);
});
