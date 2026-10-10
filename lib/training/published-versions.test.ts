import assert from "node:assert/strict";
import test from "node:test";
import {
  latestPublishedTrainingVersion,
  publishedTrainingVersions,
} from "./published-versions.ts";

test("latest published training follows human publication timestamp, not numeric version order", () => {
  const versions = [
    { id: "draft", version_number: 5, published_at: null },
    { id: "v4", version_number: 4, published_at: "2026-10-08T10:00:00Z" },
    { id: "v2", version_number: 2, published_at: "2026-10-09T11:00:00Z" },
    { id: "v1", version_number: 1, published_at: "2026-10-01T11:00:00Z" },
  ];
  const originalOrder = versions.map((v) => v.id);
  assert.deepEqual(publishedTrainingVersions(versions).map((v) => v.id), [
    "v2", "v4", "v1",
  ]);
  assert.equal(latestPublishedTrainingVersion(versions)?.id, "v2");
  assert.deepEqual(versions.map((v) => v.id), originalOrder);
});

test("publication ties have stable id ordering and unpublished versions stay hidden", () => {
  const versions = [
    { id: "b", published_at: "2026-10-08T10:00:00Z" },
    { id: "draft", published_at: null },
    { id: "a", published_at: "2026-10-08T10:00:00Z" },
  ];
  assert.deepEqual(publishedTrainingVersions(versions).map((v) => v.id), ["a", "b"]);
  assert.equal(latestPublishedTrainingVersion([{ id: "only-draft", published_at: null }]), null);
  assert.equal(latestPublishedTrainingVersion([]), null);
});

test("published training is ordered by actual instant even when timestamp offsets differ", () => {
  const versions = [
    { id: "offset-earlier", published_at: "2026-10-10T10:00:00-03:00" },
    { id: "offset-later", published_at: "2026-10-10T14:30:00+01:00" },
    { id: "zulu", published_at: "2026-10-10T13:15:00Z" },
  ];
  assert.deepEqual(
    publishedTrainingVersions(versions).map((version) => version.id),
    ["offset-later", "zulu", "offset-earlier"],
  );
  assert.equal(latestPublishedTrainingVersion(versions)?.id, "offset-later");
});

test("equal instants resolve deterministically and invalid legacy dates cannot become current", () => {
  const versions = [
    { id: "bad", published_at: "invalid-legacy-timestamp" },
    { id: "b", published_at: "2026-10-10T10:00:00-03:00" },
    { id: "a", published_at: "2026-10-10T13:00:00Z" },
    { id: "draft", published_at: "" },
  ];
  assert.deepEqual(publishedTrainingVersions(versions).map((v) => v.id), [
    "a", "b", "bad",
  ]);
  assert.equal(latestPublishedTrainingVersion(versions)?.id, "a");
  assert.equal(versions[0].id, "bad");
});
