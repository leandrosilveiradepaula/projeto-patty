/**
 * A client response does not close a clarification. Only the professional
 * resolution makes it resolved; no adherence or clinical priority is inferred.
 */
export type ClarificationFollowupStatus =
  | "awaiting_client"
  | "awaiting_professional"
  | "resolved";

export function clarificationFollowupStatus(input: {
  hasResponse: boolean;
  resolved: boolean;
}): ClarificationFollowupStatus {
  if (input.resolved) return "resolved";
  return input.hasResponse ? "awaiting_professional" : "awaiting_client";
}

export function clarificationStatusLabel(
  status: ClarificationFollowupStatus,
  audience: "admin" | "client",
): string {
  if (status === "resolved") return "Resolvido";
  if (status === "awaiting_professional") {
    return audience === "admin" ? "Ação da Patty" : "Aguardando revisão da Patty";
  }
  return audience === "admin" ? "Aguardando cliente" : "Aguardando sua resposta";
}

export function clarificationStatusVariant(
  status: ClarificationFollowupStatus,
): "positive" | "warning" | "neutral" {
  if (status === "resolved") return "positive";
  if (status === "awaiting_professional") return "warning";
  return "neutral";
}
