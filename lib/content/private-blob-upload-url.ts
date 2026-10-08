import "server-only";

import { issueSignedToken, presignUrl } from "@vercel/blob";

const PRIVATE_BLOB_UPLOAD_TTL_MS = 10 * 60 * 1000;

export async function createPrivateBlobUploadUrl(input: {
  contentType: string;
  maximumSizeInBytes: number;
  pathname: string;
}) {
  const validUntil = Date.now() + PRIVATE_BLOB_UPLOAD_TTL_MS;
  const token = await issueSignedToken({
    allowedContentTypes: [input.contentType],
    maximumSizeInBytes: input.maximumSizeInBytes,
    operations: ["put"],
    pathname: input.pathname,
    validUntil,
  });
  const { presignedUrl } = await presignUrl(token, {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: false,
    allowedContentTypes: [input.contentType],
    maximumSizeInBytes: input.maximumSizeInBytes,
    operation: "put",
    pathname: input.pathname,
    validUntil,
  });

  return {
    expiresAt: validUntil,
    presignedUrl,
  };
}
