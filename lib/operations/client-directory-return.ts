import { readClientDirectoryPage } from "../clients/client-directory-pagination.ts";
import { readClientDirectorySearchTerm } from "../clients/client-directory-search.ts";
import { readClientDirectoryPendingView, type ClientDirectoryPendingView } from "./client-directory-pending-view.ts";

/** Navigation context only. It never affects client authorization or data reads. */
export type ClientDirectoryReturn = {
  q: string;
  view: ClientDirectoryPendingView;
  page?: number;
};

export function readClientDirectoryReturn(raw: { listaQ?: unknown; listaView?: unknown; listaPagina?: unknown }): ClientDirectoryReturn {
  return {
    q: readClientDirectorySearchTerm(raw.listaQ),
    view: readClientDirectoryPendingView(raw.listaView),
    page: readClientDirectoryPage(raw.listaPagina).page,
  };
}

export function clientDirectoryReturnParams(state: ClientDirectoryReturn): URLSearchParams {
  const params = new URLSearchParams();
  if (state.q) params.set("listaQ", readClientDirectorySearchTerm(state.q));
  if (state.view !== "all") params.set("listaView", readClientDirectoryPendingView(state.view));
  if (state.page && state.page > 1) params.set("listaPagina", String(state.page));
  return params;
}

export function clientDirectoryReturnHref(state: ClientDirectoryReturn): string {
  const params = new URLSearchParams();
  if (state.q) params.set("q", readClientDirectorySearchTerm(state.q));
  if (state.view !== "all") params.set("view", readClientDirectoryPendingView(state.view));
  if (state.page && state.page > 1) params.set("pagina", String(state.page));
  const query = params.toString();
  return "/admin/clientes" + (query ? "?" + query : "");
}

/** Appends whitelisted navigation context only to local admin URLs, preserving fragments. */
export function withClientDirectoryReturn(href: string, state: ClientDirectoryReturn): string {
  if (!href.startsWith("/admin/") || href.startsWith("//")) return href;
  const params = clientDirectoryReturnParams(state);
  if (!params.size) return href;
  const hashIndex = href.indexOf("#");
  const path = hashIndex >= 0 ? href.slice(0, hashIndex) : href;
  const hash = hashIndex >= 0 ? href.slice(hashIndex) : "";
  const questionIndex = path.indexOf("?");
  const pathname = questionIndex >= 0 ? path.slice(0, questionIndex) : path;
  const existing = new URLSearchParams(questionIndex >= 0 ? path.slice(questionIndex + 1) : "");
  // Reuse a canonical single value, even if a link already carries return params.
  for (const [key, value] of params) existing.set(key, value);
  const query = existing.toString();
  return pathname + (query ? "?" + query : "") + hash;
}
