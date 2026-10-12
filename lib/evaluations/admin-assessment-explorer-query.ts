import type { AdminAssessmentDirectoryFilters } from "./admin-assessment-explorer.ts";
import { readClientDirectorySearchTerm } from "../clients/client-directory-search.ts";

export type AdminAssessmentQuery = { q?: unknown; situacao?: unknown; tipo?: unknown; mes?: unknown; ordem?: unknown; pagina?: unknown };
export function readAdminAssessmentQuery(raw: AdminAssessmentQuery, availableKinds: readonly string[], availableMonths: readonly string[]) {
  const query = readClientDirectorySearchTerm(raw.q);
  const status = raw.situacao === "draft" || raw.situacao === "finalized" ? raw.situacao : "all";
  const kind = raw.tipo === "legacy" || (typeof raw.tipo === "string" && availableKinds.includes(raw.tipo)) ? raw.tipo : "all";
  const month = raw.mes === "invalid" || (typeof raw.mes === "string" && availableMonths.includes(raw.mes)) ? raw.mes : "all";
  const order = raw.ordem === "oldest" || raw.ordem === "client" ? raw.ordem : "newest";
  const filters: AdminAssessmentDirectoryFilters = { query, status, kind, month, order };
  const validPage = typeof raw.pagina === "string" && /^[1-9][0-9]{0,5}$/.test(raw.pagina);
  const page = validPage ? Number(raw.pagina) : 1;
  const invalid = (raw.situacao !== undefined && raw.situacao !== "all" && raw.situacao !== status)
    || (raw.tipo !== undefined && raw.tipo !== "all" && raw.tipo !== kind)
    || (raw.mes !== undefined && raw.mes !== "all" && raw.mes !== month)
    || (raw.ordem !== undefined && raw.ordem !== "newest" && raw.ordem !== order)
    || (raw.pagina !== undefined && !validPage)
    || (raw.q !== undefined && typeof raw.q !== "string");
  return { filters, page, invalid };
}
export function adminAssessmentDirectoryHref(filters: AdminAssessmentDirectoryFilters, page = 1) {
  const params = new URLSearchParams();
  if (filters.query) params.set("q", filters.query);
  if (filters.status !== "all") params.set("situacao", filters.status);
  if (filters.kind !== "all") params.set("tipo", filters.kind);
  if (filters.month !== "all") params.set("mes", filters.month);
  if (filters.order !== "newest") params.set("ordem", filters.order);
  if (page > 1 && Number.isSafeInteger(page)) params.set("pagina", String(page));
  const query = params.toString();
  return "/admin/avaliacoes" + (query ? "?" + query : "");
}
