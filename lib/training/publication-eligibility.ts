/**
 * Presentation / server preflight matching the restrictive publication RLS.
 * It does not confer access or replace MFA, review and human confirmation.
 */
export function trainingPublicationEligibility(client: {
  status: string | null | undefined;
  profile_id: string | null | undefined;
} | null | undefined): { allowed: boolean; message: string | null } {
  if (!client || client.status !== "active" || !client.profile_id) {
    return {
      allowed: false,
      message: "Publicação indisponível: a cliente precisa estar ativa e possuir acesso vinculado. O treino revisado permanece no histórico interno, sem liberação automática.",
    };
  }
  return { allowed: true, message: null };
}
