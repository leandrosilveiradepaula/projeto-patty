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
