import "server-only";

import { collectAiPages } from "@/lib/ai/history-pagination";
import { pendingReviewedFindingCount } from "@/lib/ai/pending-review-selector";
import { reconstructStoredReviewMissingTargets } from "@/lib/ai/anamnesis-review-context";
import { listAccessibleAiFindingActions } from "@/lib/ai/finding-actions";
import {
  getAccessibleAnamnesisSubmission,
  listAccessibleAnamnesisAnswers,
  listAccessibleAnamnesisQuestions,
  listAccessibleAiAnamnesisAnswerSources,
  listAccessibleAiExecutionOutputs,
} from "@/lib/supabase/data-access";
import { createClient } from "@/lib/supabase/server";

export async function listPendingCompletedAiReviews() {
  const supabase = await createClient();
  // RLS/AAL2 and current assignment constrain the candidate set before any
  // output is read. Never use a privileged client for queue discovery.
  const candidates = await collectAiPages((from, to) => supabase
    .from("ai_executions")
    .select("id, client_id, anamnesis_submission_id, purpose_key, provider, model_identifier, status, created_at, completed_at, failed_at, clients(id, full_name, profiles(display_name))")
    .eq("purpose_key", "anamnesis_review")
    .eq("status", "completed")
    .not("anamnesis_submission_id", "is", null)
    .order("created_at", { ascending: false })
    .order("id", { ascending: true })
    .range(from, to));
  const ids = candidates.map((execution) => execution.id);
  if (!ids.length) return [];
  const [outputs, sources, actions] = await Promise.all([
    listAccessibleAiExecutionOutputs(ids),
    listAccessibleAiAnamnesisAnswerSources(ids),
    listAccessibleAiFindingActions(ids),
  ]);
  const outputById = new Map(outputs.map(row => [row.execution_id, row.content]));
  const sourcesById = new Map<string, Set<string>>();
  for (const source of sources) {
    if (!source.anamnesis_answer_id || !source.anamnesis_submission_id) continue;
    const included = sourcesById.get(source.execution_id) ?? new Set<string>();
    included.add(source.anamnesis_answer_id);
    sourcesById.set(source.execution_id, included);
  }
  const actionsById = new Map<string, typeof actions>();
  for (const action of actions) {
    const rows = actionsById.get(action.execution_id) ?? [];
    rows.push(action);
    actionsById.set(action.execution_id, rows);
  }
  const submissionIds = [...new Set(candidates.map(row => row.anamnesis_submission_id).filter((id): id is string => !!id))];
  const context = new Map<string, { allowedMissing: ReadonlySet<string> | null; answerIds: Set<string> }>();
  await Promise.all(submissionIds.map(async submissionId => {
    const submission = await getAccessibleAnamnesisSubmission(submissionId);
    if (!submission || !submission.submitted_at) return;
    const [questions, answers] = await Promise.all([
      listAccessibleAnamnesisQuestions(submission.form_version_id),
      listAccessibleAnamnesisAnswers(submission.id),
    ]);
    context.set(submissionId, {
      allowedMissing: reconstructStoredReviewMissingTargets({
        answers,
        questions,
        formVersionId: submission.form_version_id,
        submissionId,
      }),
      answerIds: new Set(answers.map(a => a.id)),
    });
  }));
  return candidates.flatMap(execution => {
    const submissionId = execution.anamnesis_submission_id;
    if (!submissionId) return [];
    const scope = context.get(submissionId);
    if (!scope) return [];
    const allowedSources = new Set(
      sources.filter(source =>
        source.execution_id === execution.id &&
        source.anamnesis_submission_id === submissionId &&
        !!source.anamnesis_answer_id &&
        scope.answerIds.has(source.anamnesis_answer_id)
      ).map(source => source.anamnesis_answer_id as string),
    );
    const pendingCount = pendingReviewedFindingCount({
      allowedMissingTargetQuestionIds: scope.allowedMissing,
      allowedSourceAnswerIds: allowedSources,
      completedAt: execution.completed_at,
      failedAt: execution.failed_at,
      status: execution.status,
      content: outputById.get(execution.id),
      actions: actionsById.get(execution.id) ?? [],
    });
    return pendingCount > 0 ? [{ ...execution, pendingCount }] : [];
  });
}
