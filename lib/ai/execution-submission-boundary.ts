/**
 * Pure boundary used before invoking privileged AI-finding and recovery RPCs.
 * RLS-scoped selection of the underlying records occurs in the server action.
 */
export class AiExecutionScopeError extends Error {
  constructor() {
    super("AI execution is unavailable for this Anamnese");
    this.name = "AiExecutionScopeError";
  }
}

export function assertAiExecutionBelongsToSubmission(
  submission: { id: string; submitted_at: string | null } | null,
  executions: readonly {
    id: string;
    anamnesis_submission_id: string | null;
    status: string;
    completed_at: string | null;
    failed_at: string | null;
  }[],
  executionId: string,
  expectedState: "started" | "completed",
): void {
  if (!submission?.submitted_at) throw new AiExecutionScopeError();
  const match = executions.find(
    (item) => item.id === executionId && item.anamnesis_submission_id === submission.id,
  );
  if (!match || match.status !== expectedState) throw new AiExecutionScopeError();
  if (expectedState === "started" && (match.completed_at || match.failed_at)) {
    throw new AiExecutionScopeError();
  }
  if (expectedState === "completed" && (
    !match.completed_at ||
    !Number.isFinite(Date.parse(match.completed_at)) ||
    match.failed_at !== null
  )) {
    throw new AiExecutionScopeError();
  }
}
