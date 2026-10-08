import "server-only";

import { head } from "@vercel/blob";

type VerifiedPrivateBlobAsset = {
  byteSize: number;
  contentType: string;
  sha256Hex: string;
  storagePath: string;
};

export async function verifyPrivateBlobAsset(
  asset: VerifiedPrivateBlobAsset,
) {
  const metadata = await head(asset.storagePath);

  if (metadata.pathname !== asset.storagePath) {
    throw new Error("O objeto privado verificado não corresponde ao path informado");
  }

  if (metadata.size !== asset.byteSize) {
    throw new Error("O tamanho do objeto no Blob diverge do valor informado");
  }

  if (metadata.contentType !== asset.contentType) {
    throw new Error("O MIME type do objeto no Blob diverge do valor informado");
  }

  const sha256 = metadata.downloadUrl
    ? new URL(metadata.downloadUrl).searchParams.get("sha256")
    : null;

  if (sha256 && sha256.toLowerCase() !== asset.sha256Hex.toLowerCase()) {
    throw new Error("O SHA-256 informado diverge do metadado do objeto no Blob");
  }

  return metadata;
}
