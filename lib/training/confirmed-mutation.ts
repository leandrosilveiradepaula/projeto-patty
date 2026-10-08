/**
 * The Supabase mutation may complete without an error while affecting zero
 * rows (for example, after review/publication in a different tab or an access
 * change). Only acknowledge an administrative edit when a row is returned.
 */
export function requireConfirmedTrainingMutation(
  changed: { id: string } | null,
): void {
  if (!changed) {
    throw new Error(
      "A alteração do treino não foi confirmada. Atualize a página e confira se a versão ainda está editável.",
    );
  }
}
