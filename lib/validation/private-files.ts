export const PRIVATE_FILE_LIMITS_BYTES = {
  photo: 10 * 1024 * 1024,
  exam: 20 * 1024 * 1024,
  document: 20 * 1024 * 1024,
} as const;

export type PrivateFileKind = keyof typeof PRIVATE_FILE_LIMITS_BYTES;

type AllowedPrivateFileType = {
  extension: string;
  mimeType: string;
};

const PRIVATE_FILE_ALLOWLIST: Record<
  PrivateFileKind,
  readonly AllowedPrivateFileType[]
> = {
  photo: [
    { extension: "jpg", mimeType: "image/jpeg" },
    { extension: "jpeg", mimeType: "image/jpeg" },
    { extension: "png", mimeType: "image/png" },
    { extension: "webp", mimeType: "image/webp" },
  ],
  exam: [
    { extension: "pdf", mimeType: "application/pdf" },
    { extension: "jpg", mimeType: "image/jpeg" },
    { extension: "jpeg", mimeType: "image/jpeg" },
    { extension: "png", mimeType: "image/png" },
  ],
  document: [
    { extension: "pdf", mimeType: "application/pdf" },
    { extension: "jpg", mimeType: "image/jpeg" },
    { extension: "jpeg", mimeType: "image/jpeg" },
    { extension: "png", mimeType: "image/png" },
  ],
};

export type PrivateFileValidationError =
  | "invalid_extension"
  | "invalid_mime_type"
  | "extension_mime_mismatch"
  | "invalid_size";

export type PrivateFileValidationResult =
  | {
      ok: true;
      normalizedExtension: string;
      normalizedMimeType: string;
    }
  | {
      ok: false;
      error: PrivateFileValidationError;
    };

function normalizeExtension(extension: string) {
  return extension.trim().toLowerCase().replace(/^\./, "");
}

function normalizeMimeType(mimeType: string) {
  return mimeType.trim().toLowerCase();
}

export function validatePrivateFile(input: {
  byteSize: number;
  detectedMimeType: string;
  extension: string;
  fileKind: PrivateFileKind;
}): PrivateFileValidationResult {
  const extension = normalizeExtension(input.extension);
  const mimeType = normalizeMimeType(input.detectedMimeType);
  const allowed = PRIVATE_FILE_ALLOWLIST[input.fileKind];

  if (!allowed.some((item) => item.extension === extension)) {
    return { ok: false, error: "invalid_extension" };
  }

  if (!allowed.some((item) => item.mimeType === mimeType)) {
    return { ok: false, error: "invalid_mime_type" };
  }

  if (
    !allowed.some(
      (item) => item.extension === extension && item.mimeType === mimeType,
    )
  ) {
    return { ok: false, error: "extension_mime_mismatch" };
  }

  if (
    !Number.isSafeInteger(input.byteSize) ||
    input.byteSize <= 0 ||
    input.byteSize > PRIVATE_FILE_LIMITS_BYTES[input.fileKind]
  ) {
    return { ok: false, error: "invalid_size" };
  }

  return {
    ok: true,
    normalizedExtension: extension,
    normalizedMimeType: mimeType,
  };
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function buildPrivateFileObjectPath(input: {
  clientId: string;
  extension: string;
  fileId: string;
  fileKind: PrivateFileKind;
}) {
  if (!UUID_PATTERN.test(input.clientId) || !UUID_PATTERN.test(input.fileId)) {
    throw new Error("Invalid internal identifier for private file path");
  }

  const extension = normalizeExtension(input.extension);
  const allowed = PRIVATE_FILE_ALLOWLIST[input.fileKind];

  if (!allowed.some((item) => item.extension === extension)) {
    throw new Error("Invalid extension for private file path");
  }

  return `clients/${input.clientId}/${input.fileKind}/${input.fileId}.${extension}`;
}
