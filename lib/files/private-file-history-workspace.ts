import type { PrivateFileKindFilter, PrivateFileOriginFilter, PrivateFileViewFilter } from "./private-file-history-view.ts";
import { isPrivateFileFromClient, isPrivateFilePendingProfessionalRelease } from "./private-file-history-view.ts";

export type PrivateFileHistorySort = "newest" | "oldest" | "largest" | "smallest" | "kind";
export type PrivateFilePageParameter = "pagina" | "paginaPendentes" | "paginaHistorico";
export const PRIVATE_FILE_HISTORY_PAGE_SIZE = 12;

export type FileHistoryRecord = {
  id: string;
  created_at: string;
  file_kind: string;
  byte_size: number | null;
  uploaded_by_profile_id: string | null;
  client_visible_at: string | null;
};

export function readPrivateFileHistorySort(raw: unknown): {
  value: PrivateFileHistorySort;
  invalid: boolean;
} {
  if (raw === undefined || raw === "newest") return { value: "newest", invalid: false };
  if (raw === "oldest" || raw === "largest" || raw === "smallest" || raw === "kind") {
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

function recordInstant(value: string): number | null {
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
  visualizacao?: PrivateFileViewFilter;
  ordem?: PrivateFileHistorySort;
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
  if (state.visualizacao && state.visualizacao !== "all") params.set("visualizacao", state.visualizacao);
  if (state.ordem && state.ordem !== "newest") params.set("ordem", state.ordem);
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
