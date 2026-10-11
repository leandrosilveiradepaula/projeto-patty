import type { PrivateFileKind } from "../validation/private-files.ts";

export type PrivateFileKindFilter = PrivateFileKind | "all";
export type PrivateFileOriginFilter = "all" | "client" | "team";
export type PrivateFileViewFilter = "all" | "pending" | "history";

export function readPrivateFileKindFilter(value: unknown): PrivateFileKindFilter {
  return value === "photo" || value === "exam" || value === "document" ? value : "all";
}
export function readPrivateFileOriginFilter(value: unknown): PrivateFileOriginFilter {
  return value === "client" || value === "team" ? value : "all";
}
export function readPrivateFileViewFilter(value: unknown): PrivateFileViewFilter {
  return value === "pending" || value === "history" ? value : "all";
}

export type PrivateFileHistoryRow = {
  id: string;
  file_kind: string;
  uploaded_by_profile_id: string | null;
  client_visible_at: string | null;
};

export function isPrivateFileFromClient(
  file: Pick<PrivateFileHistoryRow, "uploaded_by_profile_id">,
  clientProfileId: string | null | undefined,
): boolean {
  return Boolean(clientProfileId && file.uploaded_by_profile_id === clientProfileId);
}

export function isPrivateFilePendingProfessionalRelease(
  file: PrivateFileHistoryRow,
  clientProfileId: string | null | undefined,
): boolean {
  return !file.client_visible_at && !isPrivateFileFromClient(file, clientProfileId);
}

export function isPrivateFileVisibleInHistory(
  file: PrivateFileHistoryRow,
  clientProfileId: string | null | undefined,
): boolean {
  return !isPrivateFilePendingProfessionalRelease(file, clientProfileId);
}

export function privateFileOriginLabel(
  file: PrivateFileHistoryRow,
  clientProfileId: string | null | undefined,
  audience: "admin" | "client",
): string {
  if (isPrivateFileFromClient(file, clientProfileId)) {
    return audience === "client" ? "Enviado por você" : "Enviado pela cliente";
  }
  if (file.uploaded_by_profile_id === null) return "Origem não identificada";
  return "Enviado pela equipe";
}

export function matchesPrivateFileFilters(
  file: PrivateFileHistoryRow,
  clientProfileId: string | null | undefined,
  kind: PrivateFileKindFilter,
  origin: PrivateFileOriginFilter,
): boolean {
  if (kind !== "all" && file.file_kind !== kind) return false;
  const fromClient = isPrivateFileFromClient(file, clientProfileId);
  if (origin === "client" && !fromClient) return false;
  if (origin === "team" && fromClient) return false;
  return true;
}

export function formatPrivateFileSize(value: number | null): string {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    return "Tamanho não informado";
  }
  if (value < 1024) return `${value} B`;
  const unit = value < 1024 * 1024 ? "KB" : "MB";
  const divisor = unit === "KB" ? 1024 : 1024 * 1024;
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value / divisor)} ${unit}`;
}

export function formatPrivateFileRecordedAt(value: string | null): string {
  if (!value || !Number.isFinite(Date.parse(value))) return "Data indisponível";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

export const privateFileKindLabels: Record<PrivateFileKind, string> = {
  document: "Documento",
  exam: "Exame",
  photo: "Foto",
};
