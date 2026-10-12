/**
 * Client-only navigation over submissions already returned by authenticated RLS.
 * Do not index question text, answers or health data into URL parameters.
 */
export type ClientAnamnesisHistoryRecord = {
  id: string;
  created_at: string;
  submitted_at: string | null;
  anamnesis_form_versions: { version_number: number | null } | null;
};

export type ClientAnamnesisClarificationCounts = {
  awaitingClient: number;
  awaitingProfessional: number;
};

export type ClientAnamnesisHistoryFilters = {
  status: "all" | "draft" | "submitted";
  attention: "all" | "client" | "professional" | "none";
  version: string;
  order: "newest" | "oldest";
  page: number;
};

const PAGE_SIZE = 8;

export function readClientAnamnesisHistoryFilters(
  raw: Record<string, unknown>,
): ClientAnamnesisHistoryFilters {
  const version = raw.versao;
  return {
    status: raw.estado === "draft" || raw.estado === "submitted" ? raw.estado : "all",
    attention:
      raw.pendencia === "client" ||
      raw.pendencia === "professional" ||
      raw.pendencia === "none"
        ? raw.pendencia
        : "all",
    version:
      version === "none" ||
      (typeof version === "string" && /^[1-9][0-9]{0,5}$/.test(version))
        ? version
        : "all",
    order: raw.ordem === "oldest" ? "oldest" : "newest",
    page:
      typeof raw.pagina === "string" && /^[1-9][0-9]{0,3}$/.test(raw.pagina)
        ? Number(raw.pagina)
        : 1,
  };
}

function instant(value: string): number | null {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function exploreClientAnamnesisHistory<T extends ClientAnamnesisHistoryRecord>(
  submissions: readonly T[],
  clarifications: ReadonlyMap<string, ClientAnamnesisClarificationCounts>,
  filters: ClientAnamnesisHistoryFilters,
) {
  const versions = [...new Set(
    submissions
      .map((item) => item.anamnesis_form_versions?.version_number)
      .filter((number): number is number => typeof number === "number" && Number.isSafeInteger(number) && number > 0),
  )].sort((a, b) => b - a);

  const summary = {
    drafts: submissions.filter((item) => item.submitted_at === null).length,
    submitted: submissions.filter((item) => item.submitted_at !== null).length,
    awaitingClient: submissions.filter((item) => (clarifications.get(item.id)?.awaitingClient ?? 0) > 0).length,
    awaitingProfessional: submissions.filter((item) => (clarifications.get(item.id)?.awaitingProfessional ?? 0) > 0).length,
  };

  const matched = submissions.filter((item) => {
    if (filters.status === "draft" && item.submitted_at !== null) return false;
    if (filters.status === "submitted" && item.submitted_at === null) return false;

    const number = item.anamnesis_form_versions?.version_number;
    if (filters.version === "none" && number !== null && number !== undefined) return false;
    if (filters.version !== "all" && filters.version !== "none" && String(number) !== filters.version) return false;

    const counts = clarifications.get(item.id);
    const awaitingClient = (counts?.awaitingClient ?? 0) > 0;
    const awaitingProfessional = (counts?.awaitingProfessional ?? 0) > 0;
    if (filters.attention === "client" && !awaitingClient) return false;
    if (filters.attention === "professional" && !awaitingProfessional) return false;
    if (filters.attention === "none" && (awaitingClient || awaitingProfessional)) return false;
    return true;
  });

  const ordered = [...matched].sort((left, right) => {
    const a = instant(left.created_at);
    const b = instant(right.created_at);
    if (a !== null && b !== null && a !== b) {
      return filters.order === "oldest" ? a - b : b - a;
    }
    if ((a !== null) !== (b !== null)) return a !== null ? -1 : 1;
    return left.id.localeCompare(right.id);
  });
  const total = ordered.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(filters.page, pages);
  const first = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  return {
    items: ordered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    total,
    first,
    last: Math.min(page * PAGE_SIZE, total),
    page,
    pages,
    previous: page > 1 ? page - 1 : null,
    next: page < pages ? page + 1 : null,
    versions,
    summary,
  };
}

export function clientAnamnesisHistoryHref(
  filters: ClientAnamnesisHistoryFilters,
  page: number,
): string {
  const params = new URLSearchParams();
  if (filters.status !== "all") params.set("estado", filters.status);
  if (filters.attention !== "all") params.set("pendencia", filters.attention);
  if (filters.version !== "all") params.set("versao", filters.version);
  if (filters.order !== "newest") params.set("ordem", filters.order);
  if (page > 1) params.set("pagina", String(page));
  return "/cliente/anamnese" + (params.size ? "?" + params.toString() : "") + "#historico-anamnese";
}
