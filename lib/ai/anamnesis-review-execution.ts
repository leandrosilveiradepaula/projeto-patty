import "server-only";

import {
  AnamnesisReviewContextBuildError,
  buildAnamnesisReviewContext,
} from "@/lib/ai/anamnesis-review-context";
import { startInternalAnamnesisReviewExecution } from "@/lib/ai/ai-execution-persistence";
import { requireRole } from "@/lib/supabase/auth";
import {
  getAccessibleAnamnesisSubmission,
  listAccessibleAnamnesisAnswers,
  listAccessibleAnamnesisQuestions,
} from "@/lib/supabase/data-access";

export type PreparedAnamnesisReviewExecution = {
  allowedMissingTargetQuestionIds: ReadonlySet<string>;
  allowedSourceAnswerIds: ReadonlySet<string>;
  clientId: string;
  formVersionId: string;
  initiatedByProfileId: string;
  sources: ReturnType<typeof buildAnamnesisReviewContext>["sources"];
  submissionId: string;
};

export class AnamnesisReviewPreparationError extends Error {
  constructor(
    public readonly code:
      | "submission_unavailable"
      | "context_invariant_failed",
  ) {
    super(code);
    this.name = "AnamnesisReviewPreparationError";
  }
}

export async function prepareAnamnesisReviewExecution(input: {
  explicitlyIncludedAnswerIds?: readonly string[];
  submissionId: string;
}): Promise<PreparedAnamnesisReviewExecution> {
  const auth = await requireRole("admin");
  const submission = await getAccessibleAnamnesisSubmission(input.submissionId);

  if (!submission || !submission.submitted_at) {
    throw new AnamnesisReviewPreparationError("submission_unavailable");
  }

  const [answers, questions] = await Promise.all([
    listAccessibleAnamnesisAnswers(submission.id),
    listAccessibleAnamnesisQuestions(submission.form_version_id),
  ]);

  try {
    const reviewContext = buildAnamnesisReviewContext({
      answers,
      explicitlyIncludedAnswerIds: input.explicitlyIncludedAnswerIds,
      formVersionId: submission.form_version_id,
      questions,
      submissionId: submission.id,
    });

    return {
      ...reviewContext,
      clientId: submission.client_id,
      formVersionId: submission.form_version_id,
      initiatedByProfileId: auth.profileId,
      submissionId: submission.id,
    };
  } catch (error) {
    if (error instanceof AnamnesisReviewContextBuildError) {
      throw new AnamnesisReviewPreparationError("context_invariant_failed");
    }

    throw error;
  }
}

export async function startAnamnesisReviewExecutionRecord(input: {
  explicitlyIncludedAnswerIds?: readonly string[];
  modelIdentifier: string;
  promptVersionId: string;
  provider: string;
  submissionId: string;
}) {
  const prepared = await prepareAnamnesisReviewExecution({
    explicitlyIncludedAnswerIds: input.explicitlyIncludedAnswerIds,
    submissionId: input.submissionId,
  });

  const executionId = await startInternalAnamnesisReviewExecution({
    answerIds: [...prepared.allowedSourceAnswerIds],
    clientId: prepared.clientId,
    initiatedByProfileId: prepared.initiatedByProfileId,
    modelIdentifier: input.modelIdentifier,
    promptVersionId: input.promptVersionId,
    provider: input.provider,
    submissionId: prepared.submissionId,
  });

  return {
    executionId,
    prepared,
  };
}
