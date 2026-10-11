export type ProtocolCatalogStatus = "all" | "with-version" | "needs-recovery";

/** Query strings are user-controlled and repeated keys arrive as arrays. */
export function readProtocolCatalogTerm(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, 120) : "";
}

export function readProtocolCatalogStatus(value: unknown): ProtocolCatalogStatus {
  return value === "with-version" || value === "needs-recovery" ? value : "all";
}

function normalized(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR").trim();
}

export function protocolTypeLabel(value: string): string {
  return value === "nutrition" ? "Nutricional" : value;
}

export type ProtocolCatalogRow = {
  id: string;
  client_id: string;
  created_at: string;
  protocol_type: string;
  clients: {
    id: string;
    full_name: string | null;
    profiles: { display_name: string | null } | null;
  } | null;
};

export function protocolCatalogClientName(
  protocol: ProtocolCatalogRow,
): string {
  return protocol.clients?.full_name?.trim() ||
    protocol.clients?.profiles?.display_name?.trim() ||
    "Cliente sem nome cadastrado";
}

export function selectProtocolCatalog<T extends ProtocolCatalogRow>(
  protocols: readonly T[],
  versionedIds: ReadonlySet<string>,
  query: string,
  status: ProtocolCatalogStatus,
): T[] {
  const term = normalized(query);
  return protocols.filter((protocol) => {
    const hasVersion = versionedIds.has(protocol.id);
    if (status === "with-version" && !hasVersion) return false;
    if (status === "needs-recovery" && hasVersion) return false;
    if (!term) return true;
    // Canonical name is displayed; legacy profile name remains searchable.
    return [protocol.clients?.full_name, protocol.clients?.profiles?.display_name]
      .some((name) => typeof name === "string" && normalized(name).includes(term));
  }).sort((left, right) => {
    const nameOrder = protocolCatalogClientName(left).localeCompare(
      protocolCatalogClientName(right), "pt-BR", { sensitivity: "base" },
    );
    if (nameOrder) return nameOrder;
    const leftDate = Date.parse(left.created_at);
    const rightDate = Date.parse(right.created_at);
    const a = Number.isFinite(leftDate) ? leftDate : -Infinity;
    const b = Number.isFinite(rightDate) ? rightDate : -Infinity;
    return b - a || left.id.localeCompare(right.id);
  });
}

/** Prefer a real version when resolving two concurrent/legacy protocol parents. */
export function existingProtocolNavigation(
  protocols: readonly { id: string }[],
  versionedIds: ReadonlySet<string>,
): { kind: "detail" | "recover"; id: string } | null {
  const versioned = protocols.find((protocol) => versionedIds.has(protocol.id));
  if (versioned) return { kind: "detail", id: versioned.id };
  const first = protocols[0];
  return first ? { kind: "recover", id: first.id } : null;
}
