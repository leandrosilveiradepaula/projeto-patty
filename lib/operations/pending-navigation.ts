export type PendingQueueFocus = "patty" | "client" | "operational";

export const pendingQueueLinks: Record<PendingQueueFocus, string> = {
  patty: "/admin/pendencias?grupo=patty#acao-da-patty",
  client: "/admin/pendencias?grupo=client#aguardando-cliente",
  operational: "/admin/pendencias?grupo=operational#operacional-do-sistema",
};

export function parsePendingQueueFocus(value: unknown): PendingQueueFocus | null {
  if (value === "patty" || value === "client" || value === "operational") {
    return value;
  }

  return null;
}
