import type { ClientPendingSummary } from "./client-pending-summary.ts";

export type ClientDirectoryPendingView = "all" | "pending" | "patty" | "waiting" | "operational" | "clear";

export const CLIENT_DIRECTORY_PENDING_VIEW_LABELS: Record<ClientDirectoryPendingView, string> = {
  all: "Todas em acompanhamento",
  pending: "Com qualquer pendência",
  patty: "Com ação da Patty",
  waiting: "Aguardando cliente",
  operational: "Com pendência operacional",
  clear: "Sem pendências",
};

export function readClientDirectoryPendingView(raw: unknown): ClientDirectoryPendingView {
  return typeof raw === "string" && Object.hasOwn(CLIENT_DIRECTORY_PENDING_VIEW_LABELS, raw)
    ? raw as ClientDirectoryPendingView
    : "all";
}

export function matchesClientDirectoryPendingView(
  summary: ClientPendingSummary | undefined,
  view: ClientDirectoryPendingView,
): boolean {
  switch (view) {
    case "all": return true;
    case "pending": return (summary?.total ?? 0) > 0;
    case "patty": return (summary?.patty.length ?? 0) > 0;
    case "waiting": return (summary?.waiting ?? 0) > 0;
    case "operational": return (summary?.operational ?? 0) > 0;
    case "clear": return (summary?.total ?? 0) === 0;
  }
}

export function countClientDirectoryPendingViews(
  clientIds: readonly string[],
  summaries: ReadonlyMap<string, ClientPendingSummary>,
): Record<ClientDirectoryPendingView, number> {
  const counts: Record<ClientDirectoryPendingView, number> = {
    all: clientIds.length, pending: 0, patty: 0, waiting: 0, operational: 0, clear: 0,
  };
  for (const id of clientIds) {
    const summary = summaries.get(id);
    for (const view of ["pending", "patty", "waiting", "operational", "clear"] as const) {
      if (matchesClientDirectoryPendingView(summary, view)) counts[view]++;
    }
  }
  return counts;
}
