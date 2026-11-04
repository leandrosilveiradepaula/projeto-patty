import assert from "node:assert/strict";
import test from "node:test";
import { protocolPublicationEligibility } from "./publication-eligibility.ts";

test("only an active Client with a linked Profile can be considered for publication", () => {
  const allowed = protocolPublicationEligibility({
    status: "active", profile_id: "00000000-0000-4000-8000-000000000001",
  });
  assert.deepEqual(allowed, { allowed: true, message: null });
});

test("historical inactive or orphaned Clients remain internal even after professional approval", () => {
  for (const client of [
    null,
    { status: "inactive", profile_id: null },
    { status: "inactive", profile_id: "00000000-0000-4000-8000-000000000001" },
    { status: "active", profile_id: null },
    { status: "active", profile_id: "" },
    { status: null, profile_id: "00000000-0000-4000-8000-000000000001" },
  ]) {
    const result = protocolPublicationEligibility(client);
    assert.equal(result.allowed, false);
    assert.match(result.message!, /Publicação indisponível/);
    assert.match(result.message!, /histórico interno/);
    assert.doesNotMatch(JSON.stringify(result), /00000000-0000/);
  }
});
