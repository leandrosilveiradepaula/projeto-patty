import assert from "node:assert/strict";
import test from "node:test";
import { newestClientContentReleases, sortClientContentReleaseOptions } from "./release-order.ts";

test("content release choices group title and prefer latest published version", () => {
  const input = [
    { id: "3", title: "Treino", version_number: 1 },
    { id: "1", title: "Alimentação", version_number: 1 },
    { id: "2", title: "Alimentação", version_number: 2 },
  ];
  assert.deepEqual(sortClientContentReleaseOptions(input).map((x) => x.id), ["2", "1", "3"]);
  assert.equal(input[0].id, "3");
});

test("release history is newest-first across offsets and invalid legacy times", () => {
  const input = [
    { id: "old", released_at: "2026-10-08T12:00:00Z" },
    { id: "bad", released_at: "invalid" },
    { id: "new", released_at: "2026-10-09T12:00:00-03:00" },
  ];
  assert.deepEqual(newestClientContentReleases(input).map((x) => x.id), ["new", "old", "bad"]);
  assert.equal(input[0].id, "old");
});
