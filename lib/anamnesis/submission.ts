import "server-only";

import { getCurrentClient } from "@/lib/supabase/data-access";
import { requireRoleIdentity } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validation/uuid";
import { ANAMNESIS_QUESTION_KEYS } from "./question-keys";
import { ANAMNESIS_CONSENT_ACCEPTED_VALUE } from "./consent-policy";

export type AnamnesisSubmissionErrorCode =
  | "client_not_found"
  | "consent_question_not_available"
  | "draft_not_found"
  | "incomplete_or_invalid_answers"
  | "invalid_identifier";

export class AnamnesisSubmissionError extends Error {
  constructor(public readonly code: AnamnesisSubmissionErrorCode) {
    super(code);
    this.name = "AnamnesisSubmissionError";
  }
}

export async function submitCurrentClientAnamnesisDraft(
  submissionId: string,
  input: { consentAccepted: true },
) {
  if (!isUuid(submissionId)) {
    throw new AnamnesisSubmissionError("invalid_identifier");
  }

  const auth = await requireRoleIdentity("client");
  const client = await getCurrentClient();

  if (!client || client.profile_id !== auth.profileId) {
    throw new AnamnesisSubmissionError("client_not_found");
  }

  const supabase = await createClient();

  const { data: draft, error: draftError } = await supabase
    .from("anamnesis_submissions")
    .select("id, form_version_id")
    .eq("id", submissionId)
    .eq("client_id", client.id)
    .is("submitted_at", null)
    .maybeSingle();

  if (draftError) {
    throw draftError;
  }

  if (!draft) {
    throw new AnamnesisSubmissionError("draft_not_found");
  }

  if (!input.consentAccepted) {
    throw new AnamnesisSubmissionError("incomplete_or_invalid_answers");
  }

  const { data: consentQuestion, error: consentQuestionError } = await supabase
    .from("anamnesis_questions")
    .select("id, answer_type, required, options")
    .eq("form_version_id", draft.form_version_id)
    .eq("question_key", ANAMNESIS_QUESTION_KEYS.consentAcceptance)
    .maybeSingle();

  if (consentQuestionError) {
    throw consentQuestionError;
  }

  if (
    !consentQuestion ||
    consentQuestion.answer_type !== "single_choice" ||
    !consentQuestion.required ||
    !Array.isArray(consentQuestion.options) ||
    consentQuestion.options.length !== 1 ||
    consentQuestion.options[0] !== ANAMNESIS_CONSENT_ACCEPTED_VALUE
  ) {
    throw new AnamnesisSubmissionError("consent_question_not_available");
  }

  const { data: existingConsentAnswer, error: existingConsentAnswerError } =
    await supabase
      .from("anamnesis_answers")
      .select("id")
      .eq("submission_id", draft.id)
      .eq("question_id", consentQuestion.id)
      .maybeSingle();

  if (existingConsentAnswerError) {
    throw existingConsentAnswerError;
  }

  if (existingConsentAnswer) {
    const { error: updateConsentError } = await supabase
      .from("anamnesis_answers")
      .update({ answer_value: ANAMNESIS_CONSENT_ACCEPTED_VALUE })
      .eq("id", existingConsentAnswer.id);

    if (updateConsentError) {
      throw updateConsentError;
    }
  } else {
    const { error: insertConsentError } = await supabase
      .from("anamnesis_answers")
      .insert({
        answer_value: ANAMNESIS_CONSENT_ACCEPTED_VALUE,
        form_version_id: draft.form_version_id,
        question_id: consentQuestion.id,
        submission_id: draft.id,
      });

    if (insertConsentError) {
      throw insertConsentError;
    }
  }

  const { data, error } = await supabase
    .from("anamnesis_submissions")
    .update({ submitted_at: new Date().toISOString() })
    .eq("id", submissionId)
    .eq("client_id", client.id)
    .is("submitted_at", null)
    .select("id, client_id, form_version_id, submitted_at")
    .maybeSingle();

  if (error) {
    if (error.code === "23514") {
      throw new AnamnesisSubmissionError("incomplete_or_invalid_answers");
    }

    throw error;
  }

  if (!data) {
    throw new AnamnesisSubmissionError("draft_not_found");
  }

  return data;
}
