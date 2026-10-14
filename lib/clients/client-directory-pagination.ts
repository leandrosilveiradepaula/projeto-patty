import { readClientDirectoryPendingView, type ClientDirectoryPendingView } from "../operations/client-directory-pending-view.ts";
import { readClientDirectorySearchTerm } from "./client-directory-search.ts";

export const CLIENT_DIRECTORY_PAGE_SIZE = 20;

export function readClientDirectoryPage(raw: unknown): { page: number; invalid: boolean } {
  if (raw === undefined || raw === "1") return { page: 1, invalid: false };
  if (typeof raw !== "string" || !/^[1-9][0-9]{0,5}$/.test(raw)) return { page: 1, invalid: true };
  const page = Number(raw);
  return page <= 100000 ? { page, invalid: false } : { page: 1, invalid: true };
}

/** Paginate after filtering; keep empty results empty rather than inventing a record. */
export function paginateClientDirectory<T>(clients: readonly T[], requestedPage: number) {
  const pageCount = Math.max(1, Math.ceil(clients.length / CLIENT_DIRECTORY_PAGE_SIZE));
  const validPage = Number.isSafeInteger(requestedPage) && requestedPage >= 1 ? requestedPage : 1;
  const page = Math.min(validPage, pageCount);
  const start = (page - 1) * CLIENT_DIRECTORY_PAGE_SIZE;
  return {
    items: clients.slice(start, start + CLIENT_DIRECTORY_PAGE_SIZE),
    page,
    pageCount,
    total: clients.length,
    first: clients.length ? start + 1 : 0,
    last: Math.min(clients.length, start + CLIENT_DIRECTORY_PAGE_SIZE),
    adjusted: validPage !== page,
  };
}

export function clientDirectoryPageHref(state: { q: string; view: ClientDirectoryPendingView; page: number }): string {
  const params = new URLSearchParams();
  const q = readClientDirectorySearchTerm(state.q);
  if (q) params.set("q", q);
  if (state.view !== "all") params.set("view", readClientDirectoryPendingView(state.view));
  if (state.page > 1 && Number.isSafeInteger(state.page)) params.set("pagina", String(state.page));
  const query = params.toString();
  return "/admin/clientes" + (query ? "?" + query : "");
}
