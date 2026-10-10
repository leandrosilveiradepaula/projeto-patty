export type ReleasedEducationalAsset = {
  id: string;
  asset_key: string;
  content_type: string;
  byte_size: number | null;
};

/**
 * Stable order for client-visible assets belonging to an explicitly released
 * content version. Never selects a different version or exposes storage paths.
 */
export function orderReleasedEducationalAssets<T extends ReleasedEducationalAsset>(
  assets: readonly T[],
): T[] {
  return [...assets].sort((left, right) =>
    Number(right.asset_key === "primary") - Number(left.asset_key === "primary") ||
    left.asset_key.localeCompare(right.asset_key, "pt-BR", { sensitivity: "base" }) ||
    left.id.localeCompare(right.id),
  );
}

export function educationalAssetKind(contentType: string): string {
  const type = contentType.trim().toLowerCase();
  if (type === "application/pdf") return "PDF";
  if (type.startsWith("video/")) return "Vídeo";
  if (type.startsWith("audio/")) return "Áudio";
  if (type.startsWith("image/")) return "Imagem";
  if (type.startsWith("text/")) return "Texto";
  return "Arquivo";
}

export function educationalAssetSize(bytes: number | null): string {
  if (bytes === null || !Number.isSafeInteger(bytes) || bytes < 0) {
    return "Tamanho não informado";
  }
  const size = bytes < 1024 ? bytes : bytes / 1024;
  if (bytes < 1024) return `${size} B`;
  if (bytes < 1024 ** 2) return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(size)} KB`;
  if (bytes < 1024 ** 3) return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(bytes / (1024 ** 2))} MB`;
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(bytes / (1024 ** 3))} GB`;
}

export function educationalAssetOpenLabel(
  asset: ReleasedEducationalAsset,
  position: number,
  hasPrimary: boolean,
): string {
  if (asset.asset_key === "primary") return "Abrir conteúdo";
  return hasPrimary ? `Abrir anexo ${position}` : `Abrir arquivo ${position + 1}`;
}
