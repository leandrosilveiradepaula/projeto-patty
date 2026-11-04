export type AssignmentStartStatus = "already_active" | "create";

export function getAssignmentStartStatus(
  activeAssignmentId: string | null,
): AssignmentStartStatus {
  return activeAssignmentId ? "already_active" : "create";
}

/**
 * An assignment is not an identity onboarding operation. A historical Client
 * without a linked Profile cannot start or resume a professional assignment.
 * This check does not prove that Cadastro Atual or password setup is complete.
 */
export function canStartAssignmentForLinkedClient(
  client: Readonly<{ profile_id: string | null }> | null,
): boolean {
  return client !== null && client.profile_id !== null;
}
