import "server-only";

import type { Json } from "@/lib/supabase/database.types";
import { createAdminClient } from "@/lib/supabase/admin";

export type InternalAiFailureInput = {
  executionId: string;
  failureCode: string;
  failureMessage: string | null;
  failureStage: string;
  responseContent?: string | null;
  responseContentFormat?: "json" | "text" | null;
  responseReceivedAt?: string | null;
};

export async function startInternalAnamnesisReviewExecution(input: {
  answerIds: readonly string[];
  clientId: string;
  initiatedByProfileId: string;
  modelIdentifier: string;
  promptVersionId: string;
  provider: string;
  submissionId: string;
}) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc(
    "start_anamnesis_review_execution",
    {
      p_answer_ids: [...input.answerIds],
      p_client_id: input.clientId,
      p_initiated_by_profile_id: input.initiatedByProfileId,
      p_model_identifier: input.modelIdentifier,
      p_prompt_version_id: input.promptVersionId,
      p_provider: input.provider,
      p_submission_id: input.submissionId,
    },
  );

  if (error) {
    throw error;
  }

  return data;
}

export async function completeInternalAiExecution(
  executionId: string,
  content: Json,
) {
  const supabase = createAdminClient();
  const { error } = await supabase.rpc("complete_ai_execution", {
    p_content: content,
    p_execution_id: executionId,
  });

  if (error) {
    throw error;
  }
}

export async function failInternalAiExecution(input: InternalAiFailureInput) {
  const supabase = createAdminClient();
  const { error } = await supabase.rpc("fail_ai_execution", {
    p_execution_id: input.executionId,
    p_failure_code: input.failureCode,
    p_failure_message: input.failureMessage,
    p_failure_stage: input.failureStage,
    p_response_content: input.responseContent ?? null,
    p_response_content_format: input.responseContentFormat ?? null,
    p_response_received_at: input.responseReceivedAt ?? null,
  });

  if (error) {
    throw error;
  }
}
