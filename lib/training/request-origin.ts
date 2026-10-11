/** Factual provenance only, never an automatic professional decision. */
export function trainingRequestOriginLabel(
  recordedByProfileId: string | null | undefined,
  clientProfileId: string | null | undefined,
  audience: "admin" | "client",
): string {
  if (!recordedByProfileId) return "Origem não identificada";
  if (clientProfileId && recordedByProfileId === clientProfileId) {
    return audience === "client" ? "Enviada por você" : "Enviada pela cliente";
  }
  return "Registrada pela equipe";
}
