import { readClientDirectorySearchTerm } from "../clients/client-directory-search.ts";
import { readClientDirectoryPendingView, type ClientDirectoryPendingView } from "./client-directory-pending-view.ts";

/** Navigation context only. It never affects client authorization or data reads. */
export type ClientDirectoryReturn = {
  q: string;
  view: ClientDirectoryPendingView;
};

export function readClientDirectoryReturn(raw: { listaQ?: unknown; listaView?: unknown }): ClientDirectoryReturn {
  return {
    q: readClientDirectorySearchTerm(raw.listaQ),
    view: readClientDirectoryPendingView(raw.listaView),
  };
}

export function clientDirectoryReturnParams(state: ClientDirectoryReturn): URLSearchParams {
  const params = new URLSearchParams();
  if (state.q) params.set("listaQ", readClientDirectorySearchTerm(state.q));
  if (state.view !== "all") params.set("listaView", readClientDirectoryPendingView(state.view));
  return params;
}

export function clientDirectoryReturnHref(state: ClientDirectoryReturn): string {
  const params = new URLSearchParams();
  if (state.q) params.set("q", readClientDirectorySearchTerm(state.q));
  if (state.view !== "all") params.set("view", readClientDirectoryPendingView(state.view));
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
  return path + (path.includes("?") ? "&" : "?") + params.toString() + hash;
}
