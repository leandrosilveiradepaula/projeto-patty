/**
 * A missing row in a conditional release update is not proof of publication.
 * Recheck the persisted state before reporting "already visible".
 */
export function classifyPrivateFileReleasePostcondition(
  file: { client_visible_at: string | null } | null,
): "already_visible" | "not_found" | "unconfirmed" {
  if (!file) return "not_found";
  return file.client_visible_at ? "already_visible" : "unconfirmed";
}
