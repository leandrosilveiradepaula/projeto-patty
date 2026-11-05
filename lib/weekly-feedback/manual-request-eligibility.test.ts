import assert from "node:assert/strict";
import test from "node:test";
import { manualWeeklyFeedbackEligibility } from "./manual-request-eligibility.ts";

test("manual feedback is possible only for active Client with Profile and published protocol", () => {
  assert.deepEqual(
    manualWeeklyFeedbackEligibility(
      {status:"active",profile_id:"00000000-0000-4000-8000-000000000001"},true
    ),
    {allowed:true,message:null},
  );
});
test("no new feedback for inactive, orphaned, or unpublished Client", () => {
  for(const [client,published] of [
    [null,true],
    [{status:"inactive",profile_id:"00000000-0000-4000-8000-000000000001"},true],
    [{status:"inactive",profile_id:null},true],
    [{status:"active",profile_id:null},true],
    [{status:"active",profile_id:""},true],
    [{status:"active",profile_id:"00000000-0000-4000-8000-000000000001"},false],
  ] as const) {
    const r=manualWeeklyFeedbackEligibility(client,published);
    assert.equal(r.allowed,false);
    assert.match(r.message!,/Solicitação indisponível|primeiro protocolo publicado/);
    assert.doesNotMatch(JSON.stringify(r),/00000000-0000/);
  }
});
