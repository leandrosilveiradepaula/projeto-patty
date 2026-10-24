export const EXERCISE_VERSION_VIDEO_CONTENT_TYPE = "video/mp4";

export type ExerciseVersionVideoMetadata = {
  byte_size: number;
  content_type: string;
  sha256_hex: string;
  storage_path: string;
  storage_provider: string;
  verified_at: string | null;
};

/**
 * A video can be optional, but a recorded one must remain a verified private
 * MP4. This predicate is intentionally shared by the publishing and delivery
 * boundaries so neither layer treats partial metadata as playable media.
 */
export function hasVerifiedPrivateExerciseVersionVideo(
  video: ExerciseVersionVideoMetadata | null | undefined,
) {
  return Boolean(
    video &&
      video.storage_provider === "vercel_blob" &&
      video.content_type === EXERCISE_VERSION_VIDEO_CONTENT_TYPE &&
      Number.isSafeInteger(video.byte_size) &&
      video.byte_size > 0 &&
      /^[0-9a-f]{64}$/.test(video.sha256_hex) &&
      typeof video.storage_path === "string" &&
      /^exercise-videos\/[0-9a-f-]{36}\.mp4$/.test(video.storage_path) &&
      typeof video.verified_at === "string" &&
      Number.isFinite(Date.parse(video.verified_at)),
  );
}

export function isSafeExerciseVersionVideoStoragePath(value: string) {
  return /^exercise-videos\/[0-9a-f-]{36}\.mp4$/.test(value);
}
