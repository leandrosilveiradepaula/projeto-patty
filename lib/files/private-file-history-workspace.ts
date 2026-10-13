import type { PrivateFileKindFilter, PrivateFileOriginFilter, PrivateFileViewFilter } from "./private-file-history-view.ts";
import { isPreviewablePrivateFileMimeType } from "./private-file-preview.ts";
import { isPrivateFileFromClient, isPrivateFilePendingProfessionalRelease } from "./private-file-history-view.ts";

export type PrivateFileHistorySort = "newest" | "oldest" | "largest" | "smallest" | "kind" | "released" | "released-oldest" | "name-asc" | "name-desc" | "mime";
export type PrivateFilePreviewFilter = "all" | "previewable" | "download_only";

export function readPrivateFilePreviewFilter(raw: unknown): { value: PrivateFilePreviewFilter; invalid: boolean } {
  if (raw === undefined || raw === "all") return { value: "all", invalid: false };
  if (raw === "previewable" || raw === "download_only") return { value: raw, invalid: false };
  return { value: "all", invalid: true };
}

/** Filters already-authorized file metadata; never grants access to a file. */
export function matchesPrivateFilePreviewFilter(
  mimeType: string | null,
  filter: PrivateFilePreviewFilter,
): boolean {
  if (filter === "all") return true;
  const previewable = isPreviewablePrivateFileMimeType(mimeType);
  return filter === "previewable" ? previewable : !previewable;
}
export type PrivateFilePageParameter = "pagina" | "paginaPendentes" | "paginaHistorico";
export const PRIVATE_FILE_HISTORY_PAGE_SIZE = 12;

export type FileHistoryRecord = {
  id: string;
  created_at: string;
  file_kind: string;
  byte_size: number | null;
  uploaded_by_profile_id: string | null;
  client_visible_at: string | null;
  original_filename?: string | null;
  mime_type?: string | null;
};

export function readPrivateFileHistorySort(raw: unknown): {
  value: PrivateFileHistorySort;
  invalid: boolean;
} {
  if (raw === undefined || raw === "newest") return { value: "newest", invalid: false };
  if (raw === "oldest" || raw === "largest" || raw === "smallest" || raw === "kind" || raw === "released" || raw === "released-oldest" || raw === "name-asc" || raw === "name-desc" || raw === "mime") {
    return { value: raw, invalid: false };
  }
  return { value: "newest", invalid: true };
}

export function readPrivateFileHistoryPage(raw: unknown): {
  page: number;
  invalid: boolean;
} {
  if (raw === undefined || raw === "1") return { page: 1, invalid: false };
  if (typeof raw !== "string" || !/^[1-9][0-9]{0,6}$/.test(raw)) {
    return { page: 1, invalid: true };
  }
  const page = Number(raw);
  if (!Number.isSafeInteger(page) || page > 1_000_000) return { page: 1, invalid: true };
  return { page, invalid: false };
}

function recordInstant(value: string | null): number | null {
  if (value === null) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function validSize(value: number | null): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

/** Copy-first sorting. An undefined legacy date/size sorts LAST in either direction. */
export function sortPrivateFileHistory<T extends FileHistoryRecord>(
  rows: readonly T[],
  order: PrivateFileHistorySort,
): T[] {
  return [...rows].sort((left, right) => {
    const when = () => {
      const a = recordInstant(left.created_at);
      const b = recordInstant(right.created_at);
      if (a === null || b === null) return a === null ? (b === null ? 0 : 1) : -1;
      return order === "oldest" ? a - b : b - a;
    };
    const bySize = (smallest: boolean) => {
      const a = validSize(left.byte_size);
      const b = validSize(right.byte_size);
      if (a === null || b === null) return a === null ? (b === null ? 0 : 1) : -1;
      return smallest ? a - b : b - a;
    };

    let primary = 0;
    if (order === "largest" || order === "smallest") {
      primary = bySize(order === "smallest");
    } else if (order === "kind") {
      primary = left.file_kind.localeCompare(right.file_kind, "pt-BR");
    } else if (order === "name-asc" || order === "name-desc") {
      const name = (value?: string | null) => typeof value === "string" ? value.trim() : "";
      const a = name(left.original_filename), b = name(right.original_filename);
      primary = !a || !b ? (!a && !b ? 0 : !a ? 1 : -1) : (order === "name-asc" ? 1 : -1) * a.localeCompare(b,"pt-BR",{sensitivity:"base"});
    } else if (order === "mime") {
      primary = (left.mime_type ?? "").localeCompare(right.mime_type ?? "", "pt-BR");
    } else if (order === "released" || order === "released-oldest") {
      const a = recordInstant(left.client_visible_at);
      const b = recordInstant(right.client_visible_at);
      if (a === null || b === null) primary = a === null ? (b === null ? 0 : 1) : -1;
      else primary = order === "released-oldest" ? a - b : b - a;
    }
    // Tie-break by latest stored time, then opaque ID: deterministic across pages.
    const secondary = when();
    return primary || secondary || left.id.localeCompare(right.id);
  });
}

export type PrivateFileHistoryPage<T> = {
  items: T[];
  page: number;
  pageCount: number;
  total: number;
  first: number;
  last: number;
  previous: number | null;
  next: number | null;
  outOfRange: boolean;
};

export function paginatePrivateFileHistory<T>(
  ordered: readonly T[],
  requestedPage: number,
): PrivateFileHistoryPage<T> {
  const total = ordered.length;
  const pageCount = Math.max(1, Math.ceil(total / PRIVATE_FILE_HISTORY_PAGE_SIZE));
  const valid = Number.isSafeInteger(requestedPage) && requestedPage >= 1;
  const page = valid ? Math.min(requestedPage, pageCount) : 1;
  const from = (page - 1) * PRIVATE_FILE_HISTORY_PAGE_SIZE;
  const items = ordered.slice(from, from + PRIVATE_FILE_HISTORY_PAGE_SIZE);
  return {
    items,
    page,
    pageCount,
    total,
    first: total === 0 ? 0 : from + 1,
    last: total === 0 ? 0 : from + items.length,
    previous: page > 1 ? page - 1 : null,
    next: page < pageCount ? page + 1 : null,
    outOfRange: !valid || requestedPage > pageCount,
  };
}

export function visiblePrivateFilePageNumbers(page: number, total: number): number[] {
  if (total <= 1) return total === 1 ? [1] : [];
  const numbers = new Set([1, total]);
  for (let i = Math.max(1, page - 2); i <= Math.min(total, page + 2); i++) numbers.add(i);
  return [...numbers].sort((a, b) => a - b);
}

export type PrivateFileHistoryUrlState = {
  categoria?: PrivateFileKindFilter;
  origem?: PrivateFileOriginFilter;
  formato?: PrivateFilePreviewFilter;
  visualizacao?: PrivateFileViewFilter;
  ordem?: PrivateFileHistorySort;
  ano?: string;
  mes?: string;
  minKb?: number | null;
  maxKb?: number | null;
  grupoMime?: string;
  integridadeData?: string;
  anoLiberacao?: string;
  mesLiberacao?: string;
  nome?: string;
  estadoLiberacao?: string;
  tamanho?: "all" | "known" | "unknown";
  pagina?: number;
  paginaPendentes?: number;
  paginaHistorico?: number;
  anchor?: "aguardando-liberacao" | "historico-arquivos" | "lista-arquivos";
};

/** Only enums, page numbers and internal anchors reach the URL. No filenames/PII. */
export function privateFileHistoryHref(basePath: string, state: PrivateFileHistoryUrlState) {
  const params = new URLSearchParams();
  if (state.categoria && state.categoria !== "all") params.set("categoria", state.categoria);
  if (state.origem && state.origem !== "all") params.set("origem", state.origem);
  if (state.formato && state.formato !== "all") params.set("formato", state.formato);
  if (state.visualizacao && state.visualizacao !== "all") params.set("visualizacao", state.visualizacao);
  if (state.ordem && state.ordem !== "newest") params.set("ordem", state.ordem);
  if (state.ano && /^\d{4}$/.test(state.ano)) params.set("ano", state.ano);
  if (state.mes && /^(0[1-9]|1[0-2])$/.test(state.mes)) params.set("mes", state.mes);
  for (const field of ["minKb","maxKb"] as const) { const v = state[field]; if (typeof v === "number" && Number.isSafeInteger(v) && v >= 0 && v <= 2097151) params.set(field,String(v)); }
  if (state.grupoMime && ["image","pdf","video","audio","other","unknown"].includes(state.grupoMime)) params.set("grupoMime",state.grupoMime);
  if (state.integridadeData && ["valid","invalid"].includes(state.integridadeData)) params.set("integridadeData",state.integridadeData);
  if (state.anoLiberacao && /^\d{4}$/.test(state.anoLiberacao)) params.set("anoLiberacao",state.anoLiberacao);
  if (state.mesLiberacao && /^(0[1-9]|1[0-2])$/.test(state.mesLiberacao)) params.set("mesLiberacao",state.mesLiberacao);
  if (state.nome && ["named","unnamed"].includes(state.nome)) params.set("nome",state.nome);
  if (state.estadoLiberacao && ["valid","missing","invalid"].includes(state.estadoLiberacao)) params.set("estadoLiberacao",state.estadoLiberacao);
  if (state.tamanho && state.tamanho !== "all" && (state.tamanho === "known" || state.tamanho === "unknown")) params.set("tamanho", state.tamanho);
  const pages = ["pagina", "paginaPendentes", "paginaHistorico"] as const;
  for (const name of pages) {
    const number = state[name];
    if (number && Number.isSafeInteger(number) && number > 1) {
      params.set(name, String(number));
    }
  }
  const query = params.toString();
  return basePath + (query ? "?" + query : "") + (state.anchor ? "#" + state.anchor : "");
}

export function countPrivateFileCategories<T extends Pick<FileHistoryRecord, "file_kind">>(
  rows: readonly T[],
) {
  const totals = { all: rows.length, photo: 0, exam: 0, document: 0, other: 0 };
  for (const row of rows) {
    if (row.file_kind === "photo" || row.file_kind === "exam" || row.file_kind === "document") {
      totals[row.file_kind]++;
    } else {
      totals.other++;
    }
  }
  return totals;
}

export function privateFileHistoryCounts(
  files: readonly FileHistoryRecord[],
  clientProfileId: string | null | undefined,
) {
  let client = 0, team = 0, pending = 0, history = 0;
  for (const row of files) {
    if (isPrivateFileFromClient(row, clientProfileId)) client++;
    else team++;
    if (isPrivateFilePendingProfessionalRelease(row, clientProfileId)) pending++;
    else history++;
  }
  return { all: files.length, client, team, pending, history };
}
