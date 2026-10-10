import assert from "node:assert/strict";
import test from "node:test";
import {
  collectTrainingHistoryRows,
  collectTrainingPagedRows,
  TRAINING_HISTORY_ID_BATCH_SIZE,
  TRAINING_HISTORY_PAGE_SIZE,
} from "./history-batches.ts";

test("no published training versions makes no request", async () => {
  let calls = 0;
  const result = await collectTrainingHistoryRows([], async () => {
    calls++;
    return { data: ["unexpected"], error: null };
  });
  assert.deepEqual(result, []);
  assert.equal(calls, 0);
});

test("batches unique publication IDs and reads the full multi-page history", async () => {
  const ids = Array.from({ length: TRAINING_HISTORY_ID_BATCH_SIZE + 1 }, (_, i) => `v-${i}`);
  const calls: Array<{ ids: string[]; from: number; to: number }> = [];
  const result = await collectTrainingHistoryRows([...ids, ids[0]], async (batch, from, to) => {
    calls.push({ ids: batch, from, to });
    if (batch.length === TRAINING_HISTORY_ID_BATCH_SIZE) {
      return { data: from === 0 ? Array.from({ length: TRAINING_HISTORY_PAGE_SIZE }, (_, i) => `item-${i}`) : ["last"], error: null };
    }
    return { data: ["second-batch"], error: null };
  });
  assert.equal(result.length, TRAINING_HISTORY_PAGE_SIZE + 2);
  assert.deepEqual(calls.map(c => [c.ids.length, c.from, c.to]), [[100, 0, 499], [100, 500, 999], [1, 0, 499]]);
  assert.equal(new Set(calls.flatMap(c => c.ids)).size, 101);
});

test("query failure or null response never masquerades as empty history", async () => {
  await assert.rejects(collectTrainingHistoryRows(["v"], async () => ({ data: null, error: new Error("access failed") })), /access failed/);
  await assert.rejects(collectTrainingHistoryRows(["v"], async () => ({ data: null, error: null })), /null rows/);
});

test("single-scope history reads every page, including an exactly full page", async () => {
  const calls: Array<[number, number]> = [];
  const rows = await collectTrainingPagedRows(async (from, to) => {
    calls.push([from, to]);
    return { data: from === 0 ? Array(TRAINING_HISTORY_PAGE_SIZE).fill("first") : [], error: null };
  });
  assert.equal(rows.length, TRAINING_HISTORY_PAGE_SIZE);
  assert.deepEqual(calls, [[0, 499], [500, 999]]);
});

test("single-scope history includes the last partial page and keeps source order", async () => {
  const rows = await collectTrainingPagedRows(async (from) => ({
    data: from === 0 ? Array.from({ length: TRAINING_HISTORY_PAGE_SIZE }, (_, n) => n) : [500, 501],
    error: null,
  }));
  assert.deepEqual(rows.slice(-3), [499, 500, 501]);
});

test("empty results and failures are distinct", async () => {
  assert.deepEqual(await collectTrainingPagedRows(async () => ({ data: [], error: null })), []);
  await assert.rejects(
    collectTrainingPagedRows(async () => ({ data: null, error: new Error("access denied") })),
    /access denied/,
  );
  await assert.rejects(
    collectTrainingPagedRows(async () => ({ data: null, error: null })),
    /null rows/,
  );
});

test("an error after a successful first page rejects rather than returning truncated history", async () => {
  await assert.rejects(
    collectTrainingPagedRows(async (from) => from === 0
      ? { data: Array(TRAINING_HISTORY_PAGE_SIZE).fill("prior"), error: null }
      : { data: null, error: new Error("page two failed") }),
    /page two failed/,
  );
});
