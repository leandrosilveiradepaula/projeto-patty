import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync("app/admin/feedback-semanal/page.tsx", "utf8");
const access = readFileSync("lib/supabase/data-access.ts", "utf8");

test("J2 weekly feedback inbox uses globally authorized AAL2 clients rather than active assignments", () => {
  assert.match(page, /listAllClientsForCurrentAdmin\(\)/);
  assert.doesNotMatch(page, /listClientsAssignedToCurrentAdmin|assignments\.flatMap|\.from\("client_assignments"\)/);
  assert.match(page, /authorizedClients\.map\(\(client\)/);
  const globalRead = access.slice(
    access.indexOf("export async function listAllClientsForCurrentAdmin("),
    access.indexOf("export async function listClientsAssignedToCurrentAdmin("),
  );
  assert.match(globalRead, /await requireRole\("admin"\)/);
  assert.match(globalRead, /await createClient\(\)/);
  assert.match(globalRead, /\.from\("clients"\)/);
  assert.doesNotMatch(globalRead, /createAdminClient|client_assignments/);
});

test("J2 inbox validates selected clients and does not fall back on unknown identities", () => {
  assert.match(page, /readReceivedWeeklyFeedbackQuery\(rawQuery, clientIds\)/);
  assert.match(page, /const selectedIds = filters\.invalid \? \[\] : situation\.invalid \? \[\] :/);
  assert.match(page, /filters\.clientId === "all" \? clientIds : \[filters\.clientId\]/);
  assert.match(page, /listReceivedWeeklyFeedbackHeadersForClients\(selectedIds, filters\)/);
  assert.match(page, /listPendingWeeklyFeedbackHeadersForClients\(selectedIds, filters\)/);
  assert.match(page, /isPending && !invalidSelection/);
  assert.match(page, /listReminderEventsForVisiblePendingFeedbacks\(pendingResults\.items\)/);
});
