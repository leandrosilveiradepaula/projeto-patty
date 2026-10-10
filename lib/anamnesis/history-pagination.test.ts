import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  collectAnamnesisHistoryRows,
  ANAMNESIS_HISTORY_ID_BATCH_SIZE,
  ANAMNESIS_HISTORY_PAGE_SIZE,
} from "./history-pagination.ts";

const read = (p: string) =>
  readFileSync(new URL("../../" + p, import.meta.url), "utf8");

test("no parent IDs returns empty without making a query", async () => {
  let calls = 0;
  assert.deepEqual(await collectAnamnesisHistoryRows([], async () => {
    calls++;
    return { data: ["unexpected"], error: null };
  }), []);
  assert.equal(calls, 0);
});

test("deduplicated parent IDs are batched and complete pages are always followed", async () => {
  const ids = Array.from({ length: ANAMNESIS_HISTORY_ID_BATCH_SIZE + 1 }, (_, i) => "parent-" + i);
  const requests: Array<{ ids: string[]; from: number; to: number }> = [];
  const result = await collectAnamnesisHistoryRows([...ids, ids[0]], async (batch, from, to) => {
    requests.push({ ids: batch, from, to });
    if (batch.length === ANAMNESIS_HISTORY_ID_BATCH_SIZE) {
      return {
        data: from === 0
          ? Array.from({ length: ANAMNESIS_HISTORY_PAGE_SIZE }, (_, i) => "answer-" + i)
          : ["final-partial-page"],
        error: null,
      };
    }
    return { data: ["last-batch"], error: null };
  });
  assert.deepEqual(requests.map(x => [x.ids.length, x.from, x.to]), [
    [100, 0, 499],
    [100, 500, 999],
    [1, 0, 499],
  ]);
  assert.equal(result.length, ANAMNESIS_HISTORY_PAGE_SIZE + 2);
  assert.equal(new Set(requests.flatMap(x => x.ids)).size, ANAMNESIS_HISTORY_ID_BATCH_SIZE + 1);
  assert.equal(result.at(-1), "last-batch");
});

test("exactly full final pages cause a bounded empty-page read", async () => {
  const calls: number[] = [];
  const rows = await collectAnamnesisHistoryRows(["one"], async (_ids, from) => {
    calls.push(from);
    return { data: from === 0 ? Array(ANAMNESIS_HISTORY_PAGE_SIZE).fill("v") : [], error: null };
  });
  assert.equal(rows.length, ANAMNESIS_HISTORY_PAGE_SIZE);
  assert.deepEqual(calls, [0, 500]);
});

test("failed or null query never silently creates an incomplete clinical history", async () => {
  const accessDenied = new Error("RLS query failed");
  await assert.rejects(
    collectAnamnesisHistoryRows(["one"], async () => ({ data: null, error: accessDenied })),
    /RLS query failed/,
  );
  await assert.rejects(
    collectAnamnesisHistoryRows(["one"], async () => ({ data: null, error: null })),
    /null rows/,
  );
});

test("Anamnesis history and clarification access functions all paginate under the authenticated client", () => {
  const source = read("lib/supabase/data-access.ts");
  const names = [
    "listAccessibleAnamnesisSubmissions",
    "listAccessibleAnamnesisSections",
    "listAccessibleAnamnesisQuestions",
    "listAccessibleAnamnesisAnswers",
    "listAccessibleAnamnesisAnswerCorrections",
    "listAccessibleAnamnesisClarificationRequests",
    "listAccessibleAnamnesisClarificationRequestsForSubmissions",
    "listAccessibleAnamnesisClarificationResponses",
    "listAccessibleAnamnesisClarificationResolutions",
    "listAccessibleAnamnesisReviews",
    "listAccessibleAnamnesisReviewsForSubmissions",
  ];
  for (const name of names) {
    const start = source.indexOf("export async function " + name + "(");
    assert.notEqual(start, -1, "access function missing: " + name);
    const end = source.indexOf("\nexport async function ", start + 15);
    const fn = source.slice(start, end < 0 ? undefined : end);
    assert.match(fn, /const supabase = await createClient\(\)/, name);
    assert.match(fn, /collectAnamnesisHistoryRows\(/, name);
    assert.match(fn, /\.range\(from, to\)/, name);
    assert.doesNotMatch(fn, /createAdminClient|service_role/, name);
  }
  for (const name of [
    "listAccessibleAnamnesisAnswerCorrections",
    "listAccessibleAnamnesisClarificationRequestsForSubmissions",
    "listAccessibleAnamnesisClarificationResponses",
    "listAccessibleAnamnesisClarificationResolutions",
    "listAccessibleAnamnesisReviewsForSubmissions",
  ]) {
    const start = source.indexOf("export async function " + name + "(");
    const end = source.indexOf("\nexport async function ", start + 15);
    const fn = source.slice(start, end < 0 ? undefined : end);
    assert.match(fn, /\.sort\(\(a, b\) =>/, "global ordering across ID batches: " + name);
  }
  assert.match(source, /\.order\("created_at", \{ ascending: false \}\)\s*\.order\("id", \{ ascending: false \}\)\s*\.range\(from, to\)/);
});
