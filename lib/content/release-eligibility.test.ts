import assert from "node:assert/strict";
import test from "node:test";

import { isContentVersionReleaseEligible } from "./release-eligibility.ts";

test("published content not yet released is eligible", () => {
  assert.equal(
    isContentVersionReleaseEligible({
      alreadyReleased: false,
      publishedAt: "2026-09-22T12:00:00.000Z",
    }),
    true,
  );
});

test("unpublished content is not eligible", () => {
  assert.equal(
    isContentVersionReleaseEligible({
      alreadyReleased: false,
      publishedAt: null,
    }),
    false,
  );
});

test("already released content is not eligible", () => {
  assert.equal(
    isContentVersionReleaseEligible({
      alreadyReleased: true,
      publishedAt: "2026-09-22T12:00:00.000Z",
    }),
    false,
  );
});

test("already released unpublished facts remain ineligible", () => {
  assert.equal(
    isContentVersionReleaseEligible({
      alreadyReleased: true,
      publishedAt: null,
    }),
    false,
  );
});
