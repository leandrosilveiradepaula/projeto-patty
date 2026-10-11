/** Pure, read-only presentation of RLS-authorized nonterminal AI executions. */
export type AiInboxEntry = {
  id: string;
  clientName: string;
  clientId: string | null;
  submissionId: string | null;
  purposeKey: string;
  createdAt: string;
};
export type AiInboxPurpose = "all" | "anamnesis_review" | "other";
export type AiInboxOrder = "oldest" | "newest";
export type AiInboxFilters = {
  q: string;
  purpose: AiInboxPurpose;
  order: AiInboxOrder;
  requestedPage: number;
  invalidPage: boolean;
};
export const AI_INBOX_PAGE_SIZE = 12;

function textParam(value: unknown) {
  return typeof value === "string" ? value : "";
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
}

export function parseAiInboxFilters(raw: {
  q?: unknown;
  purpose?: unknown;
  order?: unknown;
  page?: unknown;
}): AiInboxFilters {
  const q = textParam(raw.q).trim().slice(0, 100);
  const value = textParam(raw.purpose);
  const purpose: AiInboxPurpose =
    value === "anamnesis_review" || value === "other" ? value : "all";
  const order: AiInboxOrder = raw.order === "newest" ? "newest" : "oldest";
  const valuePage = textParam(raw.page);
  const validPage = /^[1-9][0-9]{0,5}$/.test(valuePage);
  return {
    q,
    purpose,
    order,
    requestedPage: validPage ? Number(valuePage) : 1,
    invalidPage: raw.page !== undefined && !validPage,
  };
}

export function aiInboxHref(filters: AiInboxFilters, page: number) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.purpose !== "all") params.set("purpose", filters.purpose);
  if (filters.order !== "oldest") params.set("order", filters.order);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return "/admin/ia" + (query ? "?" + query : "");
}

export function getAiInboxView(entries: readonly AiInboxEntry[], filters: AiInboxFilters) {
  const query = normalize(filters.q);
  const filtered = entries.filter((entry) =>
    (filters.purpose === "all" ||
      (filters.purpose === "anamnesis_review"
        ? entry.purposeKey === "anamnesis_review"
        : entry.purposeKey !== "anamnesis_review")) &&
    (!query || normalize(entry.clientName).includes(query)),
  );
  filtered.sort((a, b) => {
    const at = Date.parse(a.createdAt);
    const bt = Date.parse(b.createdAt);
    const aValid = Number.isFinite(at);
    const bValid = Number.isFinite(bt);
    if (aValid !== bValid) return aValid ? -1 : 1;
    const byTime = aValid && bValid
      ? filters.order === "oldest" ? at - bt : bt - at
      : 0;
    return byTime || a.id.localeCompare(b.id);
  });
  const pages = Math.max(1, Math.ceil(filtered.length / AI_INBOX_PAGE_SIZE));
  const page = Math.min(filters.requestedPage, pages);
  const offset = (page - 1) * AI_INBOX_PAGE_SIZE;
  const items = filtered.slice(offset, offset + AI_INBOX_PAGE_SIZE);
  return {
    items,
    total: entries.length,
    filteredTotal: filtered.length,
    page,
    pages,
    first: filtered.length ? offset + 1 : 0,
    last: filtered.length ? offset + items.length : 0,
    pageWasAdjusted: filters.invalidPage || page !== filters.requestedPage,
  };
}
