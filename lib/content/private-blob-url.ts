import "server-only";

import { issueSignedToken, presignUrl } from "@vercel/blob";

const PRIVATE_BLOB_URL_TTL_MS = 5 * 60 * 1000;

export async function createPrivateBlobReadUrl(pathname: string) {
  const validUntil = Date.now() + PRIVATE_BLOB_URL_TTL_MS;
  const token = await issueSignedToken({
    pathname,
    operations: ["get"],
    validUntil,
  });
  const { presignedUrl } = await presignUrl(token, {
    access: "private",
    operation: "get",
    pathname,
    useCache: false,
    validUntil,
  });

  return presignedUrl;
}
