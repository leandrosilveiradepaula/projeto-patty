import assert from "node:assert/strict";
import test from "node:test";

import {
  hasVerifiedPrivateExerciseVersionVideo,
  isSafeExerciseVersionVideoStoragePath,
} from "./exercise-version-video.ts";

const validVideo = {
  byte_size: 32,
  content_type: "video/mp4",
  sha256_hex: "a".repeat(64),
  storage_path: "exercise-videos/11111111-1111-4111-8111-111111111111.mp4",
  storage_provider: "vercel_blob",
  verified_at: "2026-10-23T12:00:00.000Z",
};

test("only a verified private MP4 with opaque exercise path is playable", () => {
  assert.equal(hasVerifiedPrivateExerciseVersionVideo(validVideo), true);
  assert.equal(isSafeExerciseVersionVideoStoragePath(validVideo.storage_path), true);
});

test("partial, public, non-MP4, or non-opaque video metadata fails closed", () => {
  assert.equal(hasVerifiedPrivateExerciseVersionVideo({ ...validVideo, verified_at: null }), false);
  assert.equal(hasVerifiedPrivateExerciseVersionVideo({ ...validVideo, content_type: "video/webm" }), false);
  assert.equal(hasVerifiedPrivateExerciseVersionVideo({ ...validVideo, storage_provider: "external" }), false);
  assert.equal(hasVerifiedPrivateExerciseVersionVideo({ ...validVideo, sha256_hex: "not-a-hash" }), false);
  assert.equal(isSafeExerciseVersionVideoStoragePath("educational/11111111-1111-4111-8111-111111111111.mp4"), false);
  assert.equal(isSafeExerciseVersionVideoStoragePath("exercise-videos/../private.mp4"), false);
});
