/**
 * Manual weekly-feedback request preflight.
 * RLS remains authoritative: admin AAL2 and human initiation are required.
 * Historical records stay visible to authorized admins without becoming new
 * requests or automatically inviting/reactivating former clients.
 */
export function manualWeeklyFeedbackEligibility(
  client: { status: string | null | undefined; profile_id: string | null | undefined } | null | undefined,
  hasPublishedProtocol: boolean,
): { allowed: boolean; message: string | null } {
  if (!client || client.status !== "active" || !client.profile_id) {
    return {
      allowed: false,
      message: "Solicitação indisponível: a cliente precisa estar ativa e possuir acesso vinculado. O histórico permanece disponível para consulta administrativa.",
    };
  }
  if (!hasPublishedProtocol) {
    return {
      allowed: false,
      message: "O Feedback Semanal só pode ser solicitado depois que a cliente receber o primeiro protocolo publicado.",
    };
  }
  return { allowed: true, message: null };
}
