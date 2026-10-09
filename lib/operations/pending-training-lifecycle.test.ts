import assert from "node:assert/strict";
import test from "node:test";
import { derivePendingTrainingLifecycle } from "./pending-training-lifecycle.ts";

const clients = [{ id: "client-a", label: "Cliente A" }];
const plan = { id: "plan-a", client_id: "client-a" };
const request = (id: string, at: string) => ({ id, client_id: "client-a", requested_at: at });
const version = (id: string, number: number, published: string | null, reviewed: string | null = null) => ({
  id, training_plan_id: "plan-a", version_number: number,
  published_at: published, reviewed_at: reviewed, created_at: "2026-10-01T12:00:00Z",
});

test("no plan makes only the latest actual request actionable despite DB order", () => {
  const result = derivePendingTrainingLifecycle({
    clients, plans: [], versions: [],
    requests: [
      request("old", "2026-10-01T10:00:00Z"),
      request("new", "2026-10-09T11:00:00Z"),
      request("middle", "2026-10-08T10:00:00Z"),
    ],
  });
  assert.deepEqual(result.map((item) => [item.id, item.state]), [["new", "requested_without_plan"]]);
});

test("only latest open draft remains in the queue, independent of version array order", () => {
  const result = derivePendingTrainingLifecycle({
    clients, plans: [plan], requests: [],
    versions: [version("draft-new", 5, null), version("published", 4, "2026-10-07T12:00:00Z"), version("draft-old", 2, null)],
  });
  assert.deepEqual(result.map((item) => [item.id, item.versionNumber, item.state]), [["draft-new", 5, "draft"]]);
});

test("unpublished reviewed version is actionable as a separate manual publication step", () => {
  const result = derivePendingTrainingLifecycle({
    clients, plans: [plan], requests: [],
    versions: [version("reviewed", 7, null, "2026-10-09T12:00:00Z")],
  });
  assert.equal(result[0]?.state, "reviewed_not_published");
  assert.equal(result[0]?.createdAt, "2026-10-09T12:00:00Z");
});

test("new request after publication remains visible with an existing draft", () => {
  const result = derivePendingTrainingLifecycle({
    clients, plans: [plan],
    requests: [request("recent", "2026-10-09T14:00:00Z"), request("old", "2026-10-04T10:00:00Z")],
    versions: [version("draft", 3, null), version("published", 2, "2026-10-08T12:00:00Z")],
  });
  assert.deepEqual(result.map((item) => [item.id, item.state]), [
    ["recent", "requested_after_publication"],
    ["draft", "draft"],
  ]);
});

test("no request alert for an older request or a request before latest publication", () => {
  const result = derivePendingTrainingLifecycle({
    clients, plans: [plan],
    requests: [request("old", "2026-10-04T10:00:00Z")],
    versions: [version("published", 2, "2026-10-08T12:00:00Z")],
  });
  assert.deepEqual(result, []);
});

test("same-instant cross-timezone request is not misclassified as post-publication", () => {
  const result = derivePendingTrainingLifecycle({
    clients, plans: [plan],
    requests: [request("same", "2026-10-09T09:00:00-03:00")],
    versions: [version("published", 3, "2026-10-09T12:00:00Z")],
  });
  assert.deepEqual(result, []);
});

test("only assigned client ids enter the queue, even if inputs carry other client rows", () => {
  const result = derivePendingTrainingLifecycle({
    clients, plans: [],
    requests: [request("ours", "2026-10-09T11:00:00Z"), { id: "other", client_id: "unassigned", requested_at: "2026-10-09T14:00:00Z" }],
    versions: [],
  });
  assert.deepEqual(result.map((item) => item.clientId), ["client-a"]);
});

test("source version and request arrays are not mutated by queue derivation", () => {
  const requests = [request("old", "2026-10-05T08:00:00Z"), request("new", "2026-10-09T11:00:00Z")];
  const versions = [version("draft-old", 1, null), version("draft-new", 2, null)];
  derivePendingTrainingLifecycle({ clients, plans: [plan], requests, versions });
  assert.deepEqual(requests.map((x) => x.id), ["old", "new"]);
  assert.deepEqual(versions.map((x) => x.id), ["draft-old", "draft-new"]);
});
