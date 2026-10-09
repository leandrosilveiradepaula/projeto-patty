import {
  validatePrivateFile,
  type PrivateFileKind,
  type PrivateFileValidationError,
} from "../validation/private-files.ts";

export type PrivateFileSelectionLike = {
  name: string;
  size: number;
  type: string;
};

export type PrivateFileSelectionResult =
  | {
      ok: true;
      byteSize: number;
      claimedMimeType: string;
      extension: string;
      originalFilename: string;
    }
  | {
      ok: false;
      error: PrivateFileValidationError | "missing_file" | "invalid_original_filename";
    };

/**
 * Preflight only: the server revalidates metadata and sniffs actual file bytes.
 * Never infer acceptance or visibility from a successful browser preflight.
 */
export function validatePrivateFileUploadSelection(
  file: PrivateFileSelectionLike | null,
  fileKind: PrivateFileKind,
): PrivateFileSelectionResult {
  if (!file || file.size === 0) {
    return { ok: false, error: "missing_file" };
  }

  if (typeof file.name !== "string") {
    return { ok: false, error: "invalid_original_filename" };
  }
  const originalFilename = file.name.trim();
  if (!originalFilename || originalFilename.length > 255) {
    return { ok: false, error: "invalid_original_filename" };
  }

  const dotIndex = originalFilename.lastIndexOf(".");
  const extension = dotIndex >= 0 ? originalFilename.slice(dotIndex + 1) : "";
  const validated = validatePrivateFile({
    byteSize: file.size,
    detectedMimeType: file.type,
    extension,
    fileKind,
  });

  if (!validated.ok) {
    return validated;
  }

  return {
    ok: true,
    byteSize: file.size,
    claimedMimeType: validated.normalizedMimeType,
    extension: validated.normalizedExtension,
    originalFilename,
  };
}
