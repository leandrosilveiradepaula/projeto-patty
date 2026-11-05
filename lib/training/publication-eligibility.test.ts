import assert from "node:assert/strict";
import test from "node:test";
import { trainingPublicationEligibility } from "./publication-eligibility.ts";

test("an active Client with Profile is eligible only for human publication", () => {
  assert.deepEqual(
    trainingPublicationEligibility({status:"active",profile_id:"00000000-0000-4000-8000-000000000001"}),
    {allowed:true,message:null},
  );
});
test("historical, inactive or unlinked Client cannot receive a training publication", () => {
  for (const client of [
    null, {status:"inactive",profile_id:null},
    {status:"inactive",profile_id:"00000000-0000-4000-8000-000000000001"},
    {status:"active",profile_id:null}, {status:"active",profile_id:""},
    {status:"pending",profile_id:"00000000-0000-4000-8000-000000000001"},
  ]) {
    const result=trainingPublicationEligibility(client);
    assert.equal(result.allowed,false);
    assert.match(result.message!,/Publicação indisponível/);
    assert.match(result.message!,/histórico interno/);
    assert.doesNotMatch(JSON.stringify(result),/00000000-0000/);
  }
});
