/** Recovery is descriptive; the server remains authoritative about completion. */
export type PrivateFileUploadSessionStatus =
  | "pending"
  | "validating"
  | "accepted"
  | "rejected"
  | "expired"
  | "unavailable";

export type PrivateFileUploadRecoveryDecision =
  | { next: "confirmed"; message: string }
  | { next: "resume"; message: string }
  | { next: "wait"; message: string }
  | { next: "new_selection"; message: string }
  | { next: "manual_review"; message: string };

export function privateFileUploadRecoveryDecision(
  status: PrivateFileUploadSessionStatus,
): PrivateFileUploadRecoveryDecision {
  switch (status) {
    case "accepted":
      return {
        next: "confirmed",
        message: "O servidor confirmou que o arquivo foi recebido e registrado.",
      };
    case "pending":
      return {
        next: "resume",
        message: "O arquivo foi transferido, mas a sessão ainda aguarda finalização. Você pode concluir esta mesma sessão, sem enviar outro arquivo.",
      };
    case "validating":
      return {
        next: "wait",
        message: "O servidor ainda está validando a sessão. Não inicie outro envio. Verifique novamente após alguns instantes.",
      };
    case "rejected":
      return {
        next: "new_selection",
        message: "A sessão foi rejeitada. Escolha um arquivo válido e confirme um novo envio.",
      };
    case "expired":
      return {
        next: "new_selection",
        message: "A sessão expirou. Selecione novamente o arquivo e solicite um novo envio.",
      };
    default:
      return {
        next: "manual_review",
        message: "Não foi possível confirmar o estado desta sessão. Consulte o histórico antes de decidir por um novo envio.",
      };
  }
}
