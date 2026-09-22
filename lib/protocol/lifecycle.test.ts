import assert from "node:assert/strict";
import test from "node:test";

import { getProtocolLifecycleAction } from "./lifecycle.ts";

test("draft version must be submitted before any other lifecycle action", () => {
  assert.equal(
    getProtocolLifecycleAction({
      hasApproval: false,
      hasPublication: false,
      submittedForReview: false,
    }),
    "submit",
  );
});

test("submitted version without approval can only be approved", () => {
  assert.equal(
    getProtocolLifecycleAction({
      hasApproval: false,
      hasPublication: false,
      submittedForReview: true,
    }),
    "approve",
  );
});

test("approved version without publication can only be published", () => {
  assert.equal(
    getProtocolLifecycleAction({
      hasApproval: true,
      hasPublication: false,
      submittedForReview: true,
    }),
    "publish",
  );
});

test("published version has no further lifecycle action", () => {
  assert.equal(
    getProtocolLifecycleAction({
      hasApproval: true,
      hasPublication: true,
      submittedForReview: true,
    }),
    "complete",
  );
});

test("publication always wins over inconsistent lower-level facts", () => {
  assert.equal(
    getProtocolLifecycleAction({
      hasApproval: false,
      hasPublication: true,
      submittedForReview: false,
    }),
    "complete",
  );
});

test("approval always wins over missing submitted flag in inconsistent facts", () => {
  assert.equal(
    getProtocolLifecycleAction({
      hasApproval: true,
      hasPublication: false,
      submittedForReview: false,
    }),
    "publish",
  );
});
