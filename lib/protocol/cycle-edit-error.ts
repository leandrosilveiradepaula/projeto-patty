/** Database dependency errors must never be mistaken for an edit conflict. */
export function protocolCycleEditFailureMessage(error: unknown): string {
  const value = error && typeof error === "object" ? error as Record<string, unknown> : {};
  if (value.code === "PGRST202" || value.code === "42883") {
    return "A edição da sequência está temporariamente indisponível: a função necessária ainda não está instalada no banco. Nenhuma alteração foi gravada. Solicite a verificação técnica do ambiente.";
  }
  if (value.code === "P0001") {
    return "O ciclo mudou em outra sessão. Nenhuma alteração foi gravada. Atualize a página antes de editar novamente.";
  }
  if (value.code === "55000") {
    return "Esta versão já foi enviada para revisão e não aceita alterações no ciclo. Nenhuma alteração foi gravada.";
  }
  return "Não foi possível confirmar a alteração. Nenhuma gravação foi confirmada; atualize e confira o ciclo antes de repetir.";
}

/**
 * Safe capability probe for the atomic writer. P0002 means the authenticated
 * function executed and rejected the intentionally nonexistent plan.
 * A success response, unknown code or transport failure is NOT proof of readiness.
 */
export function draftCycleWriterReadiness(error: unknown): "available" | "missing" | "unverified" {
  const code = error && typeof error === "object"
    ? (error as { code?: unknown }).code : null;
  if (code === "P0002") return "available";
  if (code === "PGRST202" || code === "42883") return "missing";
  return "unverified";
}
