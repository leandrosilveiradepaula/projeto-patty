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

test("latest correction uses absolute instants across UTC offsets, without mutating order", () => {
  const older = { id: "z", event_id: "liquid", created_at: "2026-10-09T11:30:00Z", corrected_amount_ml: 250 };
  const newer = { id: "a", event_id: "liquid", created_at: "2026-10-09T09:00:00-03:00", corrected_amount_ml: 450 };
  for (const input of [[older, newer], [newer, older]]) {
    assert.equal(latestCheckinCorrectionsByEvent(input).get("liquid")?.corrected_amount_ml, 450);
  }
});

test("equal instants with different offset spellings break ties by ID", () => {
  const result = latestCheckinCorrectionsByEvent([
    { id:"b", event_id:"activity", created_at:"2026-10-09T09:00:00-03:00" },
    { id:"a", event_id:"activity", created_at:"2026-10-09T12:00:00Z" },
  ]);
  assert.equal(result.get("activity")?.id,"b");
});

test("valid correction wins over invalid legacy timestamps, and missing dates are deterministic", () => {
  const map = latestCheckinCorrectionsByEvent([
    {id:"z",event_id:"liquid",created_at:"invalid"},
    {id:"a",event_id:"liquid",created_at:"2026-10-09T12:00:00Z"},
    {id:"old",event_id:"activity",created_at:"invalid"},
    {id:"new",event_id:"activity",created_at:"invalid"},
  ]);
  assert.equal(map.get("liquid")?.id,"a");
  assert.equal(map.get("activity")?.id,"old");
});
