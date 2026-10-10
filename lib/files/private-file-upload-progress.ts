/** Display-only phases: never infer an accepted file before server finalization. */
export type PrivateFileUploadPhase =
  | "authorizing"
  | "transferring"
  | "verifying"
  | null;

export function privateFileUploadProgressMessage(phase: PrivateFileUploadPhase) {
  switch (phase) {
    case "authorizing":
      return "Preparando autorização privada do arquivo...";
    case "transferring":
      return "Transferindo arquivo para a área privada...";
    case "verifying":
      return "Validando o conteúdo e registrando o arquivo...";
    default:
      return null;
  }
}
