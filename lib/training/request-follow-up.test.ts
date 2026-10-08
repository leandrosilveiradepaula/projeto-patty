import assert from "node:assert/strict";
import test from "node:test";
import { isTrainingRequestAfterPublication } from "./request-follow-up.ts";

test("only an actual later request reopens professional follow-up", () => {
  const published = "2026-10-08T12:00:00Z";
  assert.equal(isTrainingRequestAfterPublication("2026-10-08T14:00:00+02:00", published), false);
  assert.equal(isTrainingRequestAfterPublication("2026-10-08T12:00:00Z", published), false);
  assert.equal(isTrainingRequestAfterPublication("2026-10-08T12:00:01Z", published), true);
  assert.equal(isTrainingRequestAfterPublication("2026-10-08T11:59:59Z", published), false);
  assert.equal(isTrainingRequestAfterPublication("invalid", published), false);
  assert.equal(isTrainingRequestAfterPublication("2026-10-08T13:00:00Z", null), false);
});

test("a later publication closes this specific pending follow-up, not the request history", () => {
  const request = "2026-10-08T13:00:00Z";
  assert.equal(isTrainingRequestAfterPublication(request, "2026-10-08T12:00:00Z"), true);
  assert.equal(isTrainingRequestAfterPublication(request, "2026-10-08T14:00:00Z"), false);
});
