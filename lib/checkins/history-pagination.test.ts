import assert from "node:assert/strict";
import test from "node:test";
import { collectCheckinHistoryPages, collectCheckinCorrectionRows, CHECKIN_HISTORY_PAGE_SIZE, CHECKIN_CORRECTION_ID_BATCH_SIZE, newestFirstByInstant } from "./history-pagination.ts";

test("reads all check-ins including partial and exactly full pages", async () => {
  const calls: number[] = [];
  const rows = await collectCheckinHistoryPages(async (from) => {
    calls.push(from);
    return { data: from === 0 ? Array(CHECKIN_HISTORY_PAGE_SIZE).fill("first") : ["last"], error: null };
  });
  assert.equal(rows.length, 501);
  assert.deepEqual(calls, [0, 500]);
  assert.deepEqual(await collectCheckinHistoryPages(async () => ({ data: [], error: null })), []);
});
test("exact full page requires a terminal request", async () => {
  const froms: number[] = [];
  await collectCheckinHistoryPages(async (from) => {
    froms.push(from);
    return { data: from === 0 ? Array(CHECKIN_HISTORY_PAGE_SIZE).fill("event") : [], error: null };
  });
  assert.deepEqual(froms, [0, 500]);
});
test("missing second page and unexpected null throw instead of hiding history", async () => {
  await assert.rejects(collectCheckinHistoryPages(async from => from === 0 ? { data: Array(CHECKIN_HISTORY_PAGE_SIZE).fill(1), error: null } : { data: null, error: new Error("RLS denied") }), /RLS denied/);
  await assert.rejects(collectCheckinHistoryPages(async () => ({ data: null, error: null })), /null rows/);
});
test("correction reads deduplicate and cap ID filters without mixing scopes", async () => {
  let count = 0;
  assert.deepEqual(await collectCheckinCorrectionRows([], async () => { count++; return { data: [], error: null }; }), []);
  assert.equal(count, 0);
  const ids = Array.from({length: CHECKIN_CORRECTION_ID_BATCH_SIZE+1},(_,i)=>"id-"+i);
  const calls: Array<[number,number]> = [];
  const rows = await collectCheckinCorrectionRows([...ids,ids[0]], async (batch,from) => {
    calls.push([batch.length,from]);
    return { data: batch, error: null };
  });
  assert.deepEqual(calls, [[100,0],[1,0]]);
  assert.deepEqual(rows,ids);
});
test("a later correction batch error does not return stale earlier corrections", async () => {
  const ids = Array.from({length:101},(_,i)=>String(i));
  await assert.rejects(collectCheckinCorrectionRows(ids, async (batch) => batch.length === 100 ? { data: ["first"], error: null } : { data: null, error: new Error("batch failed") }), /batch failed/);
});
test("newest-first comparison interprets offsets and preserves stable tie breaks", () => {
  const rows = [
    {id:"a",at:"2026-10-10T11:00:00-03:00"},
    {id:"c",at:"2026-10-10T15:00:00Z"},
    {id:"b",at:"2026-10-10T14:00:00Z"},
    {id:"z",at:"invalid"},
  ];
  assert.deepEqual(newestFirstByInstant(rows,x=>x.at).map(x=>x.id), ["c","b","a","z"]);
});
