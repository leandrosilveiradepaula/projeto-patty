export type AssignmentStartStatus = "already_active" | "create";

export function getAssignmentStartStatus(
  activeAssignmentId: string | null,
): AssignmentStartStatus {
  return activeAssignmentId ? "already_active" : "create";
}
