import assert from "node:assert/strict";
import test from "node:test";
import { newestTrainingRequests, newestUnpublishedTrainingVersion } from "./operational-order.ts";

test("training requests are ordered by timestamp without changing input", () => {
  const rows = [
    { id: "old", requested_at: "2026-10-09T08:00:00-03:00" },
    { id: "bad", requested_at: "invalid" },
    { id: "new", requested_at: "2026-10-09T15:00:00Z" },
    { id: "tie", requested_at: "2026-10-09T15:00:00+00:00" },
  ];
  assert.deepEqual(newestTrainingRequests(rows).map((x) => x.id), ["new", "tie", "old", "bad"]);
  assert.equal(rows[0].id, "old");
});

test("last open prescription is selected while published history stays intact", () => {
  const rows = [
    { id: "old", version_number: 1, published_at: null },
    { id: "pub", version_number: 3, published_at: "2026-10-08T12:00:00Z" },
    { id: "new", version_number: 4, published_at: null },
  ];
  assert.equal(newestUnpublishedTrainingVersion(rows)?.id, "new");
  assert.equal(newestUnpublishedTrainingVersion(rows.slice(1, 2)), null);
  assert.equal(rows[0].id, "old");
});
