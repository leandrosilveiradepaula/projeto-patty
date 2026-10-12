import type { AdminAssessmentDirectoryFilters } from "./admin-assessment-explorer.ts";

export type ClientAssessmentFilters = {
  kind: string;
  month: string;
  order: "newest" | "oldest";
};
export type ClientAssessmentQuery = {
  tipo?: unknown; mes?: unknown; ordem?: unknown; rascunhos?: unknown; historico?: unknown;
};
const isPage = (raw: unknown) => typeof raw === "string" && /^[1-9][0-9]{0,5}$/.test(raw);
export function readClientAssessmentDirectory(
  raw: ClientAssessmentQuery, knownKinds: readonly string[], months: readonly string[],
) {
  const kind = raw.tipo === "legacy" || (typeof raw.tipo === "string" && knownKinds.includes(raw.tipo)) ? raw.tipo : "all";
  const month = raw.mes === "invalid" || (typeof raw.mes === "string" && months.includes(raw.mes)) ? raw.mes : "all";
  const order = raw.ordem === "oldest" ? "oldest" : "newest";
  const filters: ClientAssessmentFilters = { kind, month, order };
  const draftPage = isPage(raw.rascunhos) ? Number(raw.rascunhos) : 1;
  const historyPage = isPage(raw.historico) ? Number(raw.historico) : 1;
  const invalid = (raw.tipo !== undefined && raw.tipo !== "all" && raw.tipo !== kind)
    || (raw.mes !== undefined && raw.mes !== "all" && raw.mes !== month)
    || (raw.ordem !== undefined && raw.ordem !== "newest" && raw.ordem !== order)
    || (raw.rascunhos !== undefined && !isPage(raw.rascunhos))
    || (raw.historico !== undefined && !isPage(raw.historico));
  return { filters, draftPage, historyPage, invalid };
}
export function clientAssessmentDirectoryFilters(
  filters: ClientAssessmentFilters, status: "draft" | "finalized",
): AdminAssessmentDirectoryFilters {
  return { query: "", status, kind: filters.kind, month: filters.month, order: filters.order };
}

/** Both independent pages retain exactly the validated filters of this workspace. */
export function clientAssessmentDirectoryHref(
  clientId: string, filters: ClientAssessmentFilters, draftPage: number, historyPage: number,
  section: "draft" | "history",
) {
  const params = new URLSearchParams();
  if (filters.kind !== "all") params.set("tipo", filters.kind);
  if (filters.month !== "all") params.set("mes", filters.month);
  if (filters.order !== "newest") params.set("ordem", filters.order);
  if (draftPage > 1 && Number.isSafeInteger(draftPage)) params.set("rascunhos", String(draftPage));
  if (historyPage > 1 && Number.isSafeInteger(historyPage)) params.set("historico", String(historyPage));
  const query = params.toString();
  return "/admin/clientes/" + encodeURIComponent(clientId) + "/avaliacoes" +
    (query ? "?" + query : "") +
    (section === "draft" ? "#avaliacoes-em-andamento" : "#historico-finalizado");
}
