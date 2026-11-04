/**
 * This is a UI/server preflight mirroring the production RESTRICTIVE RLS policy.
 * It does not grant permission. Publishing is still separately approved by a
 * human, and the database enforces ownership, MFA AAL2 and exact version.
 */
export function protocolPublicationEligibility(client: {
  status: string | null | undefined;
  profile_id: string | null | undefined;
} | null | undefined): { allowed: boolean; message: string | null } {
  if (!client || client.status !== "active" || !client.profile_id) {
    return {
      allowed: false,
      message: "Publicação indisponível: a cliente precisa estar ativa e possuir acesso vinculado. A versão aprovada permanece preservada no histórico interno; não há liberação automática.",
    };
  }

  return { allowed: true, message: null };
}
