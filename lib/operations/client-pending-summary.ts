import { getOperationalPendingGroup, type OperationalPendingItem } from "./pending.ts";

export type ClientPendingSummary = {
  patty: OperationalPendingItem[];
  waiting: number;
  operational: number;
  total: number;
};

/** Summarizes only pending items already authorized by the caller. */
export function summarizeClientPendingItems(items: readonly OperationalPendingItem[]): Map<string, ClientPendingSummary> {
  const result = new Map<string, ClientPendingSummary>();
  for (const item of items) {
    if (!item.clientId) continue;
    const summary = result.get(item.clientId) ?? { patty: [], waiting: 0, operational: 0, total: 0 };
    summary.total++;
    const group = getOperationalPendingGroup(item);
    if (group === "patty") summary.patty.push(item);
    else if (group === "client") summary.waiting++;
    else summary.operational++;
    result.set(item.clientId, summary);
  }
  for (const summary of result.values()) {
    summary.patty.sort((a,b) => {
      const at=Date.parse(a.createdAt), bt=Date.parse(b.createdAt);
      if (Number.isFinite(at) !== Number.isFinite(bt)) return Number.isFinite(at) ? -1 : 1;
      return (Number.isFinite(at) ? at-bt : 0) || a.id.localeCompare(b.id);
    });
  }
  return result;
}
