import assert from "node:assert/strict";
import test from "node:test";

import {
  canPublishEducationalContentVersion,
  educationalContentPublicationNeedsAsset,
} from "./publication-eligibility.ts";

test("confirmed video content requires an asset before publication", () => {
  assert.equal(educationalContentPublicationNeedsAsset("video"), true);
  assert.equal(
    canPublishEducationalContentVersion({
      contentTypeKey: "video",
      hasAsset: false,
    }),
    false,
  );
  assert.equal(
    canPublishEducationalContentVersion({
      contentTypeKey: "video",
      hasAsset: true,
    }),
    true,
  );
});

test("unconfirmed content types are not silently promoted to media rules", () => {
  for (const contentTypeKey of [null, "article", "pdf", "image"]) {
    assert.equal(
      educationalContentPublicationNeedsAsset(contentTypeKey),
      false,
    );
  }
});
