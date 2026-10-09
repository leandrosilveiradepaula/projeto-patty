import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  collectScopedClientOperationalRows,
  CLIENT_OPERATIONAL_ID_BATCH_SIZE,
  CLIENT_OPERATIONAL_PAGE_SIZE,
} from "./client-operational-pagination.ts";

const read = (p: string) => readFileSync(new URL("../../" + p, import.meta.url), "utf8");

test("empty client scope never reaches Supabase", async () => {
  let calls = 0;
  const rows = await collectScopedClientOperationalRows([], async () => {
    calls++;
    return { data: ["unexpected"], error: null };
  });
  assert.deepEqual(rows, []);
  assert.equal(calls, 0);
});

test("deduplicates IDs, caps IN filters and reads every page without truncation", async () => {
  const ids = Array.from({ length: CLIENT_OPERATIONAL_ID_BATCH_SIZE + 1 }, (_, i) => "client-" + i);
  const calls: Array<{ scope: string[]; from: number; to: number }> = [];
  const rows = await collectScopedClientOperationalRows([...ids, ids[0]], async (scope, from, to) => {
    calls.push({ scope, from, to });
    if (scope.length === CLIENT_OPERATIONAL_ID_BATCH_SIZE) {
      return {
        data: from === 0
          ? Array.from({ length: CLIENT_OPERATIONAL_PAGE_SIZE }, (_, i) => "item-" + i)
          : ["last-item"],
        error: null,
      };
    }
    return { data: ["second-batch"], error: null };
  });
  assert.deepEqual(calls.map(({ scope, from, to }) => [scope.length, from, to]), [
    [100, 0, 499], [100, 500, 999], [1, 0, 499],
  ]);
  assert.equal(rows.length, CLIENT_OPERATIONAL_PAGE_SIZE + 2);
  assert.equal(new Set(calls.flatMap(({ scope }) => scope)).size, ids.length);
});

test("exactly one full page requires a final empty-page fetch", async () => {
  const offsets: number[] = [];
  const rows = await collectScopedClientOperationalRows(["one"], async (_ids, from) => {
    offsets.push(from);
    return { data: from === 0 ? Array(CLIENT_OPERATIONAL_PAGE_SIZE).fill("entry") : [], error: null };
  });
  assert.equal(rows.length, CLIENT_OPERATIONAL_PAGE_SIZE);
  assert.deepEqual(offsets, [0, 500]);
});

test("errors and unexpected null results cannot masquerade as complete history", async () => {
  await assert.rejects(
    collectScopedClientOperationalRows(["id"], async () => ({ data: null, error: new Error("RLS failure") })),
    /RLS failure/,
  );
  await assert.rejects(
    collectScopedClientOperationalRows(["id"], async () => ({ data: null, error: null })),
    /null rows/,
  );
});

test("Patty queue and client weekly-feedback reads all use authenticated pagination", () => {
  const source = read("lib/supabase/data-access.ts");
  const names = [
    "listAccessibleWeeklyFeedbackNotificationPreferencesForClients",
    "listAccessibleClientNotificationEvents",
    "listAccessibleClientRegistrationsForClients",
    "listAccessibleClientTrainingRequestsForClients",
    "listAccessibleClientTrainingPlansForClients",
    "listAccessibleClientTrainingPlanVersionsForPlans",
    "listContentReleasesForAccessibleClients",
    "listAccessibleClientFilesForClients",
    "listAccessibleWeeklyFeedbacksForClient",
  ];
  for (const name of names) {
    const start = source.indexOf("export async function " + name + "(");
    assert.notEqual(start, -1, name);
    const end = source.indexOf("\nexport async function ", start + 18);
    const fn = source.slice(start, end < 0 ? undefined : end);
    assert.match(fn, /const supabase = await createClient\(\)/, name);
    assert.match(fn, /collectScopedClientOperationalRows\(/, name);
    assert.match(fn, /\.in\("[a-z_]+", ids\)/, name);
    assert.match(fn, /\.range\(from, to\)/, name);
    assert.doesNotMatch(fn, /createAdminClient|service_role|SUPABASE_SECRET_KEY/, name);
  }
  const queue = read("lib/operations/pending-data.ts");
  for (const name of names.filter(x => x.endsWith("ForClients") || x.endsWith("ForPlans"))) {
    assert.match(queue, new RegExp(name + "\\("), name);
  }
  const home = read("app/cliente/page.tsx");
  const weekly = read("app/cliente/feedback-semanal/page.tsx");
  for (const consumer of [home, weekly]) {
    assert.match(consumer, /listAccessibleWeeklyFeedbacksForClient\(client\.id\)/);
    assert.match(consumer, /listAccessibleClientNotificationEvents\(client\.id\)/);
  }
});

test("multi-client queue facts preserve global deterministic sort order after batching", () => {
  const source = read("lib/supabase/data-access.ts");
  const fn = (name: string) => {
    const i = source.indexOf("export async function " + name + "(");
    const j = source.indexOf("\nexport async function ", i + 18);
    return source.slice(i, j < 0 ? undefined : j);
  };
  for (const name of [
    "listAccessibleWeeklyFeedbackNotificationPreferencesForClients",
    "listAccessibleClientRegistrationsForClients",
    "listAccessibleClientTrainingRequestsForClients",
    "listAccessibleClientTrainingPlansForClients",
    "listAccessibleClientTrainingPlanVersionsForPlans",
    "listContentReleasesForAccessibleClients",
    "listAccessibleClientFilesForClients",
  ]) {
    assert.match(fn(name), /return rows\.sort\(/, name);
  }
  assert.match(fn("listAccessibleClientTrainingRequestsForClients"), /b\.requested_at\.localeCompare\(a\.requested_at\)/);
  assert.match(fn("listAccessibleClientTrainingPlanVersionsForPlans"), /b\.version_number - a\.version_number/);
  assert.match(fn("listAccessibleClientFilesForClients"), /b\.created_at\.localeCompare\(a\.created_at\)/);
  assert.match(fn("listAccessibleWeeklyFeedbacksForClient"), /\.order\("id", \{ ascending: false \}\)/);
});
