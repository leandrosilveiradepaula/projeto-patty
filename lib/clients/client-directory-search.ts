/** URLs with repeated q parameters produce arrays rather than strings. */
export function readClientDirectorySearchTerm(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, 120) : "";
}

export function normalizeClientDirectorySearch(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR").trim();
}

export function matchesClientDirectoryName(
  search: string,
  fullName: string | null | undefined,
  profileName: string | null | undefined,
): boolean {
  const term = normalizeClientDirectorySearch(search);
  if (!term) return true;
  // Display the canonical name, but allow finding a saved legacy profile alias.
  return [fullName, profileName].some(
    (name) => typeof name === "string" && normalizeClientDirectorySearch(name).includes(term),
  );
}

type DirectoryClient = {
  id: string;
  full_name: string | null;
  profiles: { display_name: string | null } | null;
};

export function orderClientsForPrivateFileDirectory<T extends DirectoryClient>(
  clients: readonly T[],
): T[] {
  return [...clients].sort((left, right) => {
    const a = left.full_name?.trim() || left.profiles?.display_name?.trim() || "";
    const b = right.full_name?.trim() || right.profiles?.display_name?.trim() || "";
    if (!a && !b) return left.id.localeCompare(right.id);
    if (!a) return 1;
    if (!b) return -1;
    return a.localeCompare(b, "pt-BR", { sensitivity: "base" }) ||
      left.id.localeCompare(right.id);
  });
}

export type PrivateFileDirectoryStatus = "all" | "active" | "inactive";
export type PrivateFileDirectoryLinkFilter = "all" | "linked" | "unlinked";
export const PRIVATE_FILE_CLIENT_DIRECTORY_PAGE_SIZE = 20;

export function readPrivateFileDirectoryStatus(raw: unknown): PrivateFileDirectoryStatus {
  return raw === "active" || raw === "inactive" ? raw : "all";
}
export function readPrivateFileDirectoryLinkFilter(raw: unknown): PrivateFileDirectoryLinkFilter {
  return raw === "linked" || raw === "unlinked" ? raw : "all";
}

/** Client status and account linkage never change authorization or the client identifier. */
export function matchesPrivateFileDirectoryFilters(
  client: { status: string; profile_id: string | null },
  status: PrivateFileDirectoryStatus,
  link: PrivateFileDirectoryLinkFilter,
): boolean {
  if (status !== "all" && client.status !== status) return false;
  if (link === "linked") return client.profile_id !== null;
  if (link === "unlinked") return client.profile_id === null;
  return true;
}

export function privateFileDirectoryHref(
  state: { q: string; status: PrivateFileDirectoryStatus; link: PrivateFileDirectoryLinkFilter; page: number },
): string {
  const params = new URLSearchParams();
  if (state.q) params.set("q", state.q);
  if (state.status !== "all") params.set("situacao", state.status);
  if (state.link !== "all") params.set("conta", state.link);
  if (state.page > 1 && Number.isSafeInteger(state.page)) params.set("pagina", String(state.page));
  const query = params.toString();
  return "/admin/arquivos" + (query ? "?" + query : "");
}

export function readPrivateFileDirectoryPage(raw: unknown): { value: number; invalid: boolean } {
  if (raw === undefined || raw === "1") return { value: 1, invalid: false };
  if (typeof raw !== "string" || !/^[1-9][0-9]{0,5}$/.test(raw)) return { value: 1, invalid: true };
  return { value: Number(raw), invalid: false };
}

export function paginatePrivateFileDirectory<T>(rows: readonly T[], requested: number) {
  const pageCount = Math.max(1, Math.ceil(rows.length / PRIVATE_FILE_CLIENT_DIRECTORY_PAGE_SIZE));
  const page = Math.min(Math.max(1, requested), pageCount);
  const start = (page - 1) * PRIVATE_FILE_CLIENT_DIRECTORY_PAGE_SIZE;
  return {
    items: rows.slice(start, start + PRIVATE_FILE_CLIENT_DIRECTORY_PAGE_SIZE),
    page,
    pageCount,
    total: rows.length,
    first: rows.length ? start + 1 : 0,
    last: Math.min(rows.length, start + PRIVATE_FILE_CLIENT_DIRECTORY_PAGE_SIZE),
    outOfRange: requested > pageCount,
  };
}
