import "server-only";

import { get, head } from "@vercel/blob";
import { verifyEducationalAssetBody } from "@/lib/content/private-blob-stream-integrity";

type VerifiedPrivateBlobAsset = {
  byteSize: number;
  contentType: string;
  sha256Hex: string;
  storagePath: string;
};

/**
 * HEAD alone cannot verify a browser-provided SHA-256 or MIME signature.
 * Read and hash private object bytes before allowing any metadata insertion.
 */
export async function verifyPrivateBlobAsset(asset: VerifiedPrivateBlobAsset) {
  const metadata = await head(asset.storagePath);

  if (metadata.pathname !== asset.storagePath ||
      metadata.size !== asset.byteSize ||
      metadata.contentType !== asset.contentType) {
    throw new Error("Private educational asset metadata does not match the expected object");
  }

  const fetched = await get(asset.storagePath, { access: "private" });
  if (!fetched || fetched.statusCode !== 200 || !fetched.stream ||
      fetched.blob.pathname !== asset.storagePath ||
      fetched.blob.size !== asset.byteSize ||
      fetched.blob.contentType !== asset.contentType) {
    throw new Error("Private educational asset could not be verified");
  }

  await verifyEducationalAssetBody({
    stream: fetched.stream,
    expectedByteSize: asset.byteSize,
    expectedContentType: asset.contentType,
    expectedSha256Hex: asset.sha256Hex.toLowerCase(),
  });

  return metadata;
}
