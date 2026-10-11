export const CLIENT_MORE_GROUPS = ["todos", "inicio", "planos", "registros", "historico", "materiais", "conta"] as const;
export type ClientMoreGroup = (typeof CLIENT_MORE_GROUPS)[number];
export type ClientMoreAreaGroup = Exclude<ClientMoreGroup, "todos">;
export type ClientMoreSort = "padrao" | "az";
export const CLIENT_MORE_QUERY_MAX_LENGTH = 80;
export const CLIENT_MORE_GROUP_LABELS: Record<ClientMoreGroup, string> = {
  todos: "Todas as áreas", inicio: "Início", planos: "Planos e treinos",
  registros: "Registros", historico: "Histórico", materiais: "Materiais", conta: "Conta",
};
export type ClientMoreArea = { description: string; group: ClientMoreAreaGroup; href: string; title: string };
export type ClientMoreFilters = { group: ClientMoreGroup; hasInvalidParams: boolean; query: string; sort: ClientMoreSort };

function isGroup(value: string): value is ClientMoreGroup {
  return CLIENT_MORE_GROUPS.some((group) => group === value);
}
function normalizeSearch(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").replace(/\s+/g, " ").trim();
}
export function parseClientMoreFilters(params: Record<string, string | string[] | undefined>): ClientMoreFilters {
  const rawQuery = params.q;
  const rawGroup = params.grupo;
  const rawSort = params.ordem;
  const query = typeof rawQuery === "string" ? rawQuery.trim().slice(0, CLIENT_MORE_QUERY_MAX_LENGTH) : "";
  const group = typeof rawGroup === "string" && isGroup(rawGroup) ? rawGroup : "todos";
  const sort = rawSort === "az" ? "az" : "padrao";
  const hasInvalidParams = Array.isArray(rawQuery) || Array.isArray(rawGroup) || Array.isArray(rawSort)
    || (typeof rawQuery === "string" && rawQuery.trim().length > CLIENT_MORE_QUERY_MAX_LENGTH)
    || (typeof rawGroup === "string" && !isGroup(rawGroup))
    || (typeof rawSort === "string" && rawSort !== "az" && rawSort !== "padrao");
  return { group, hasInvalidParams, query, sort };
}
export function filterClientMoreAreas(areas: readonly ClientMoreArea[], filters: ClientMoreFilters): ClientMoreArea[] {
  const terms = normalizeSearch(filters.query).split(" ").filter(Boolean);
  const matching = areas.filter((area) => {
    if (filters.group !== "todos" && area.group !== filters.group) return false;
    const content = normalizeSearch(area.title + " " + area.description);
    return terms.every((term) => content.includes(term));
  });
  if (filters.sort !== "az") return matching;
  const collator = new Intl.Collator("pt-BR", { sensitivity: "base" });
  return matching.map((area, index) => ({ area, index }))
    .sort((a, b) => collator.compare(a.area.title, b.area.title) || a.index - b.index)
    .map(({ area }) => area);
}
