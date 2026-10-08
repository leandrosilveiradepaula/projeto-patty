import assert from "node:assert/strict";
import test from "node:test";
import { collectScopedPendingRows, PENDING_ID_BATCH_SIZE, PENDING_PAGE_SIZE } from "./pending-pagination.ts";

test("empty assigned scope returns no rows and issues no query", async () => {
  let called = 0;
  const rows = await collectScopedPendingRows([], async () => {
    called++;
    return { data: ["unexpected"], error: null };
  });
  assert.deepEqual(rows, []);
  assert.equal(called, 0);
});

test("batches scoped IDs, deduplicates, paginates and preserves full results", async () => {
  const ids = Array.from({ length: PENDING_ID_BATCH_SIZE + 1 }, (_, i) => `id-${i}`);
  const calls: Array<{ batch: string[]; from: number; to: number }> = [];
  const rows = await collectScopedPendingRows([...ids, ids[0]], async (batch, from, to) => {
    calls.push({ batch, from, to });
    if (batch[0] === "id-0") {
      return {
        data: from === 0
          ? Array.from({ length: PENDING_PAGE_SIZE }, (_, i) => `row-${i}`)
          : ["row-last"],
        error: null,
      };
    }
    return { data: ["second-batch"], error: null };
  });
  assert.equal(rows.length, PENDING_PAGE_SIZE + 2);
  assert.deepEqual(calls.map(c => [c.batch.length, c.from, c.to]), [
    [100, 0, 499], [100, 500, 999], [1, 0, 499],
  ]);
  assert.equal(new Set(calls.flatMap(c => c.batch)).size, ids.length);
});

test("query error or null response fails instead of silently dropping pending tasks", async () => {
  await assert.rejects(
    collectScopedPendingRows(["id"], async () => ({ data: null, error: new Error("RLS query failed") })),
    /RLS query failed/,
  );
  await assert.rejects(
    collectScopedPendingRows(["id"], async () => ({ data: null, error: null })),
    /dados nulos sem erro/,
  );
});
