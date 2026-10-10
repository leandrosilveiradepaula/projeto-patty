import assert from "node:assert/strict";
import test from "node:test";
import { shouldBlockAssessmentSubmit } from "./useAssessmentSubmitGuard.ts";

test("the first valid explicit assessment form submit can proceed", () => {
  assert.equal(shouldBlockAssessmentSubmit(false, false, false), false);
});

test("a second same-tick submit is blocked before pending renders", () => {
  assert.equal(shouldBlockAssessmentSubmit(true, false, false), true);
});

test("a pending assessment mutation cannot be submitted again", () => {
  assert.equal(shouldBlockAssessmentSubmit(false, true, false), true);
  assert.equal(shouldBlockAssessmentSubmit(true, true, false), true);
});

test("a finalized or deleted terminal mutation remains disabled after confirmation", () => {
  assert.equal(shouldBlockAssessmentSubmit(false, false, true), true);
});

test("after a server error the state transition reopens the form for explicit retry", () => {
  assert.equal(shouldBlockAssessmentSubmit(true, false, false), true);
  assert.equal(shouldBlockAssessmentSubmit(false, false, false), false);
});
