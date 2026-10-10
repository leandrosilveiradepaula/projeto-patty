import assert from "node:assert/strict";
import test from "node:test";
import { collectLibraryPages, collectLibraryVersionRows, LIBRARY_PAGE_SIZE, LIBRARY_VERSION_BATCH_SIZE } from "./library-pagination.ts";

test("empty version scope does not send a query", async () => {
  let count = 0;
  assert.deepEqual(await collectLibraryVersionRows([], async () => { count++; return { data: [], error: null }; }), []);
  assert.equal(count, 0);
});

test("reads partial second page after a full first page", async () => {
  const starts: number[] = [];
  const rows = await collectLibraryPages(async (from, to) => {
    starts.push(from);
    assert.equal(to - from + 1, LIBRARY_PAGE_SIZE);
    return { data: from === 0 ? Array.from({ length: LIBRARY_PAGE_SIZE }, (_, i) => i) : [LIBRARY_PAGE_SIZE], error: null };
  });
  assert.equal(rows.length, LIBRARY_PAGE_SIZE + 1);
  assert.deepEqual(starts, [0, 500]);
});

test("exact full page fetches terminal empty page", async () => {
  const starts: number[] = [];
  const rows = await collectLibraryPages(async (from) => {
    starts.push(from);
    return { data: from === 0 ? Array(LIBRARY_PAGE_SIZE).fill("asset") : [], error: null };
  });
  assert.equal(rows.length, LIBRARY_PAGE_SIZE);
  assert.deepEqual(starts, [0, 500]);
});

test("batches and deduplicates version IDs without crossing scopes", async () => {
  const ids = Array.from({length: LIBRARY_VERSION_BATCH_SIZE + 1}, (_, i) => "v-" + i);
  const seen: number[] = [];
  const rows = await collectLibraryVersionRows([...ids, ids[0]], async (batch, from) => {
    assert.equal(from, 0);
    seen.push(batch.length);
    return { data: batch, error: null };
  });
  assert.deepEqual(seen, [100, 1]);
  assert.deepEqual(rows, ids);
});

test("read failure is not an empty library", async () => {
  await assert.rejects(collectLibraryPages(async () => ({ data: null, error: new Error("denied") })), /denied/);
  await assert.rejects(collectLibraryPages(async () => ({ data: null, error: null })), /null rows/);
  await assert.rejects(collectLibraryPages(async (from) => from === 0
    ? { data: Array(LIBRARY_PAGE_SIZE).fill("first"), error: null }
    : { data: null, error: new Error("later failure") }), /later failure/);
});
