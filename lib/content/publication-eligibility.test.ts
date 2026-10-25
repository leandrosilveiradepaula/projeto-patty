import assert from "node:assert/strict";
import test from "node:test";

import {
  canPublishEducationalContentVersion,
  educationalContentPublicationBlockReason,
  educationalContentPublicationNeedsAsset,
  hasCompatibleEducationalContentAsset,
} from "./publication-eligibility.ts";

const verifiedVideo = {
  asset_key: "primary",
  byte_size: 1024,
  content_type: "video/mp4",
  sha256_hex: "a".repeat(64),
  storage_path: "educational/synthetic/video.mp4",
  storage_provider: "vercel_blob",
};

const verifiedPdf = {
  ...verifiedVideo,
  content_type: "application/pdf",
  storage_path: "educational/synthetic/guide.pdf",
};

test("video and PDF each require their exact verified private primary asset", () => {
  assert.equal(educationalContentPublicationNeedsAsset("video"), true);
  assert.equal(educationalContentPublicationNeedsAsset("pdf"), true);
  assert.equal(
    canPublishEducationalContentVersion({
      contentTypeKey: "video",
      assets: [],
    }),
    false,
  );
  assert.equal(
    canPublishEducationalContentVersion({
      contentTypeKey: "video",
      assets: [verifiedVideo],
    }),
    true,
  );
  assert.equal(canPublishEducationalContentVersion({ contentTypeKey: "pdf", assets: [verifiedPdf] }), true);
  assert.equal(canPublishEducationalContentVersion({ contentTypeKey: "pdf", assets: [verifiedVideo] }), false);
});

test("empty, unknown, incompatible, and unverified assets block publication", () => {
  for (const contentTypeKey of [null, "article", "pdf", "image"]) {
    assert.equal(educationalContentPublicationNeedsAsset(contentTypeKey), contentTypeKey === "pdf");
  }
  assert.equal(canPublishEducationalContentVersion({ contentTypeKey: null, assets: [verifiedVideo] }), false);
  assert.equal(canPublishEducationalContentVersion({ contentTypeKey: "video", assets: [verifiedPdf] }), false);
  assert.equal(canPublishEducationalContentVersion({ contentTypeKey: "video", assets: [{ ...verifiedVideo, sha256_hex: "invalid" }] }), false);
  assert.match(
    educationalContentPublicationBlockReason({ contentTypeKey: "video", assets: [] }) ?? "",
    /video\/mp4/,
  );
});

test("a client listing accepts only the exact primary MIME and non-empty bytes", () => {
  assert.equal(hasCompatibleEducationalContentAsset("video", [verifiedVideo]), true);
  assert.equal(hasCompatibleEducationalContentAsset("video", [{ ...verifiedVideo, asset_key: "attachment" }]), false);
  assert.equal(hasCompatibleEducationalContentAsset("pdf", [{ ...verifiedPdf, byte_size: 0 }]), false);
});
