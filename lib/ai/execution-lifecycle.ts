export type AiExecutionLifecycleFacts = {
  completedAt: string | null;
  failedAt: string | null;
  status: string;
};

export function requiresAiExecutionRecoveryReview(
  facts: AiExecutionLifecycleFacts,
) {
  return (
    facts.status === "started" &&
    facts.completedAt === null &&
    facts.failedAt === null
  );
}
