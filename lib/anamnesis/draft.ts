import "server-only";

import type { Json } from "@/lib/supabase/database.types";
import { getCurrentClient } from "@/lib/supabase/data-access";
import { requireRoleIdentity } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validation/uuid";

import {
  getDraftAnswerWriteMode,
  getDraftCreationMode,
  isUniqueViolationCode,
} from "./draft-policy";

export type AnamnesisDraftPersistenceErrorCode =
  | "client_not_found"
  | "draft_not_found"
  | "form_version_not_available"
  | "invalid_identifier"
  | "question_not_available";

export class AnamnesisDraftPersistenceError extends Error {
  constructor(public readonly code: AnamnesisDraftPersistenceErrorCode) {
    super(code);
    this.name = "AnamnesisDraftPersistenceError";
  }
}

function requireUuid(value: string) {
  if (!isUuid(value)) {
    throw new AnamnesisDraftPersistenceError("invalid_identifier");
  }
}

async function requireCurrentClient() {
  const auth = await requireRoleIdentity("client");
  const client = await getCurrentClient();

  if (!client || client.profile_id !== auth.profileId) {
    throw new AnamnesisDraftPersistenceError("client_not_found");
  }

  return client;
}

async function findActiveDraft(clientId: string, formVersionId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("anamnesis_submissions")
    .select("id, client_id, form_version_id, created_at, submitted_at")
    .eq("client_id", clientId)
    .eq("form_version_id", formVersionId)
    .is("submitted_at", null)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function getOrCreateCurrentClientAnamnesisDraft(
  formVersionId: string,
) {
  requireUuid(formVersionId);

  const client = await requireCurrentClient();
  const supabase = await createClient();

  const { data: formVersion, error: formVersionError } = await supabase
    .from("anamnesis_form_versions")
    .select("id, published_at")
    .eq("id", formVersionId)
    .not("published_at", "is", null)
    .maybeSingle();

  if (formVersionError) {
    throw formVersionError;
  }

  if (!formVersion) {
    throw new AnamnesisDraftPersistenceError("form_version_not_available");
  }

  const existing = await findActiveDraft(client.id, formVersionId);

  if (getDraftCreationMode(existing?.id ?? null) === "reuse") {
    return {
      draft: existing,
      status: "reused" as const,
    };
  }

  const { data, error } = await supabase
    .from("anamnesis_submissions")
    .insert({
      client_id: client.id,
      form_version_id: formVersionId,
    })
    .select("id, client_id, form_version_id, created_at, submitted_at")
    .single();

  if (!error) {
    return {
      draft: data,
      status: "created" as const,
    };
  }

  if (isUniqueViolationCode(error.code)) {
    const concurrent = await findActiveDraft(client.id, formVersionId);

    if (concurrent) {
      return {
        draft: concurrent,
        status: "reused" as const,
      };
    }
  }

  throw error;
}

async function updateDraftAnswer(input: {
  answerId: string;
  answerValue: Json;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("anamnesis_answers")
    .update({ answer_value: input.answerValue })
    .eq("id", input.answerId)
    .select("id, submission_id, question_id, answer_value, updated_at")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function saveCurrentClientAnamnesisDraftAnswer(input: {
  answerValue: Json;
  questionId: string;
  submissionId: string;
}) {
  requireUuid(input.submissionId);
  requireUuid(input.questionId);

  const client = await requireCurrentClient();
  const supabase = await createClient();

  const { data: submission, error: submissionError } = await supabase
    .from("anamnesis_submissions")
    .select("id, form_version_id")
    .eq("id", input.submissionId)
    .eq("client_id", client.id)
    .is("submitted_at", null)
    .maybeSingle();

  if (submissionError) {
    throw submissionError;
  }

  if (!submission) {
    throw new AnamnesisDraftPersistenceError("draft_not_found");
  }

  const { data: question, error: questionError } = await supabase
    .from("anamnesis_questions")
    .select("id")
    .eq("id", input.questionId)
    .eq("form_version_id", submission.form_version_id)
    .maybeSingle();

  if (questionError) {
    throw questionError;
  }

  if (!question) {
    throw new AnamnesisDraftPersistenceError("question_not_available");
  }

  const { data: existingAnswer, error: existingAnswerError } = await supabase
    .from("anamnesis_answers")
    .select("id")
    .eq("submission_id", submission.id)
    .eq("question_id", question.id)
    .maybeSingle();

  if (existingAnswerError) {
    throw existingAnswerError;
  }

  if (
    getDraftAnswerWriteMode(existingAnswer?.id ?? null) === "update" &&
    existingAnswer
  ) {
    return {
      answer: await updateDraftAnswer({
        answerId: existingAnswer.id,
        answerValue: input.answerValue,
      }),
      status: "updated" as const,
    };
  }

  const { data, error } = await supabase
    .from("anamnesis_answers")
    .insert({
      answer_value: input.answerValue,
      form_version_id: submission.form_version_id,
      question_id: question.id,
      submission_id: submission.id,
    })
    .select("id, submission_id, question_id, answer_value, updated_at")
    .single();

  if (!error) {
    return {
      answer: data,
      status: "inserted" as const,
    };
  }

  if (isUniqueViolationCode(error.code)) {
    const { data: concurrent, error: concurrentError } = await supabase
      .from("anamnesis_answers")
      .select("id")
      .eq("submission_id", submission.id)
      .eq("question_id", question.id)
      .maybeSingle();

    if (concurrentError) {
      throw concurrentError;
    }

    if (concurrent) {
      return {
        answer: await updateDraftAnswer({
          answerId: concurrent.id,
          answerValue: input.answerValue,
        }),
        status: "updated" as const,
      };
    }
  }

  throw error;
}
