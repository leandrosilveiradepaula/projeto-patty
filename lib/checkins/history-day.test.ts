import assert from "node:assert/strict";
import test from "node:test";
import { parseCheckinHistoryDay, saoPauloCheckinDayRange } from "./history-day.ts";

test("historical day accepts actual past dates and rejects malformed or future",()=>{
  assert.equal(parseCheckinHistoryDay("2026-10-01", "2026-10-08"),"2026-10-01");
  assert.equal(parseCheckinHistoryDay("2026-02-29", "2026-10-08"),null);
  assert.equal(parseCheckinHistoryDay("2026-10-09", "2026-10-08"),null);
  assert.equal(parseCheckinHistoryDay("2026-10-01 OR true", "2026-10-08"),null);
});
test("historical liquid window has precise half-open local day bounds",()=>{
  assert.deepEqual(saoPauloCheckinDayRange("2026-10-01"),{
    recordedFrom:"2026-10-01T03:00:00.000Z",
    recordedBefore:"2026-10-02T03:00:00.000Z",
  });
});
