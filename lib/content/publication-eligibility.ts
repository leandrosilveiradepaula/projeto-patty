export const EDUCATIONAL_CONTENT_TYPES = [
  { key: "video", label: "Vídeo", mimeType: "video/mp4" },
  { key: "pdf", label: "PDF", mimeType: "application/pdf" },
] as const;

export type EducationalContentTypeKey = (typeof EDUCATIONAL_CONTENT_TYPES)[number]["key"];

type EducationalAssetForPublication = {
  asset_key: string;
  byte_size: number;
  content_type: string;
  sha256_hex?: string;
  storage_path?: string;
  storage_provider?: string;
};

export function isEducationalContentTypeKey(value: string | null | undefined): value is EducationalContentTypeKey {
  return EDUCATIONAL_CONTENT_TYPES.some((type) => type.key === value);
}

export function educationalContentMimeType(contentTypeKey: string | null): string | null {
  return EDUCATIONAL_CONTENT_TYPES.find((type) => type.key === contentTypeKey)?.mimeType ?? null;
}

export function educationalContentPublicationNeedsAsset(contentTypeKey: string | null) {
  return isEducationalContentTypeKey(contentTypeKey);
}

/** Client listings use only non-sensitive metadata. Publication and release
 * gates additionally require the registered private-object integrity metadata. */
export function hasCompatibleEducationalContentAsset(
  contentTypeKey: string | null,
  assets: readonly EducationalAssetForPublication[],
) {
  const expectedMimeType = educationalContentMimeType(contentTypeKey);
  return Boolean(expectedMimeType) && assets.some((asset) =>
    asset.asset_key === "primary" && asset.content_type === expectedMimeType &&
    Number.isSafeInteger(asset.byte_size) && asset.byte_size > 0,
  );
}

export function hasVerifiedPrivateEducationalContentAsset(
  contentTypeKey: string | null,
  assets: readonly EducationalAssetForPublication[],
) {
  return hasCompatibleEducationalContentAsset(contentTypeKey, assets) && assets.some((asset) =>
    asset.asset_key === "primary" &&
    asset.content_type === educationalContentMimeType(contentTypeKey) &&
    Number.isSafeInteger(asset.byte_size) && asset.byte_size > 0 &&
    asset.storage_provider === "vercel_blob" &&
    typeof asset.storage_path === "string" && asset.storage_path.length > 0 &&
    typeof asset.sha256_hex === "string" && /^[a-f0-9]{64}$/.test(asset.sha256_hex),
  );
}

export function educationalContentPublicationBlockReason(input: {
  contentTypeKey: string | null;
  assets: readonly EducationalAssetForPublication[];
}) {
  if (!isEducationalContentTypeKey(input.contentTypeKey)) {
    return "Selecione Vídeo ou PDF antes de publicar esta versão.";
  }

  const expectedMimeType = educationalContentMimeType(input.contentTypeKey)!;
  if (!hasCompatibleEducationalContentAsset(input.contentTypeKey, input.assets)) {
    return `Registre o asset privado ${expectedMimeType} da versão antes de publicar.`;
  }
  if (!hasVerifiedPrivateEducationalContentAsset(input.contentTypeKey, input.assets)) {
    return "O asset precisa permanecer registrado com SHA-256, tamanho e armazenamento privado verificados antes da publicação.";
  }
  return null;
}

export function canPublishEducationalContentVersion(input: {
  contentTypeKey: string | null;
  assets: readonly EducationalAssetForPublication[];
}) {
  return educationalContentPublicationBlockReason(input) === null;
}
