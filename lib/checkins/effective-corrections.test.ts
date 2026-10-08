import assert from "node:assert/strict";
import test from "node:test";
import { latestCheckinCorrectionsByEvent } from "./effective-corrections.ts";

const corrections = [
  { id:"a", event_id:"liquid-1", created_at:"2026-10-08T10:00:00Z", corrected_amount_ml:300 },
  { id:"c", event_id:"liquid-1", created_at:"2026-10-08T11:00:00Z", corrected_amount_ml:450 },
  { id:"b", event_id:"activity-1", created_at:"2026-10-08T10:30:00Z", corrected_did_activity:false },
  { id:"d", event_id:"activity-1", created_at:"2026-10-08T12:00:00Z", corrected_did_activity:true },
];
test("newest correction wins regardless of input ordering", () => {
  for (const input of [corrections, [...corrections].reverse()]) {
    const map=latestCheckinCorrectionsByEvent(input);
    assert.equal(map.get("liquid-1")?.id,"c");
    assert.equal(map.get("activity-1")?.id,"d");
    assert.equal(map.size,2);
  }
});
test("identical timestamps use id descending as in database query", () => {
  const map=latestCheckinCorrectionsByEvent([
    {id:"001",event_id:"x",created_at:"2026-10-08T12:00:00Z"},
    {id:"002",event_id:"x",created_at:"2026-10-08T12:00:00Z"},
  ]);
  assert.equal(map.get("x")?.id,"002");
});
test("empty corrections preserve no effective overrides", () => {
  assert.equal(latestCheckinCorrectionsByEvent([]).size,0);
});
