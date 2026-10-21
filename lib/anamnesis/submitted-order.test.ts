import assert from "node:assert/strict";
import test from "node:test";

import { latestSubmittedAnamnesis } from "./submitted-order.ts";

test("draft aid uses the latest submitted anamnesis, not creation order", () => {
  const submissions = [
    { id: "created-later", submitted_at: "2026-10-10T09:00:00Z" },
    { id: "submitted-later", submitted_at: "2026-10-10T10:00:00-03:00" },
    { id: "draft", submitted_at: null },
  ];

  assert.equal(latestSubmittedAnamnesis(submissions)?.id, "submitted-later");
  assert.deepEqual(submissions.map((submission) => submission.id), [
    "created-later",
    "submitted-later",
    "draft",
  ]);
});

test("submission selection is deterministic across offsets, invalid legacy values and ties", () => {
  const earlier = { id: "earlier", submitted_at: "2026-10-10T14:00:00+02:00" };
  const later = { id: "later", submitted_at: "2026-10-10T10:00:00-03:00" };
  const invalid = { id: "invalid", submitted_at: "legacy" };
  const sameInstantLaterId = { id: "z", submitted_at: "2026-10-10T13:00:00Z" };
  const sameInstantEarlierId = { id: "a", submitted_at: "2026-10-10T13:00:00Z" };

  assert.equal(latestSubmittedAnamnesis([earlier, later, invalid])?.id, "later");
  assert.equal(
    latestSubmittedAnamnesis([sameInstantLaterId, sameInstantEarlierId])?.id,
    "a",
  );
  assert.equal(latestSubmittedAnamnesis([{ id: "draft", submitted_at: null }]), null);
});
