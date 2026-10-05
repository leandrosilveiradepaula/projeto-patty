import "server-only";

import type { Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

async function getVerifiedProfileId() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error) {
    throw error;
  }

  return typeof data?.claims?.sub === "string" ? data.claims.sub : null;
}

export async function getCurrentLoginEmail() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error) {
    throw error;
  }

  const email = data?.claims?.email;
  return typeof email === "string" ? email : null;
}

export async function getCurrentUserProfile() {
  const profileId = await getVerifiedProfileId();

  if (!profileId) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, status, created_at, updated_at")
    .eq("id", profileId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function getCurrentClient() {
  const profileId = await getVerifiedProfileId();

  if (!profileId) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("id, profile_id, status, started_at, ended_at, created_at, updated_at")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function listClientsAssignedToCurrentAdmin() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_assignments")
    .select(
      "client_id, assigned_at, clients(id, profile_id, status, started_at, ended_at, profiles(display_name))",
    )
    .is("ended_at", null);

  if (error) {
    throw error;
  }

  return data;
}

export async function listMethodConfigurationCatalogForCurrentAdmin() {
  const supabase = await createClient();
  const { data: templates, error: templatesError } = await supabase
    .from("method_configuration_templates")
    .select(
      "id, template_key, domain_key, config_schema_key, display_name, description, created_by_kind, created_at",
    )
    .order("domain_key", { ascending: true })
    .order("display_name", { ascending: true });

  if (templatesError) {
    throw templatesError;
  }

  if (templates.length === 0) {
    return [];
  }

  const templateIds = templates.map((template) => template.id);
  const { data: versions, error: versionsError } = await supabase
    .from("method_configuration_versions")
    .select(
      "id, template_id, version_number, schema_version, configuration, source_kind, source_reference, created_by_kind, created_at, activated_at, retired_at",
    )
    .in("template_id", templateIds)
    .order("version_number", { ascending: false });

  if (versionsError) {
    throw versionsError;
  }

  const versionsByTemplate = new Map<
    string,
    typeof versions
  >();

  for (const version of versions) {
    const current = versionsByTemplate.get(version.template_id) ?? [];
    current.push(version);
    versionsByTemplate.set(version.template_id, current);
  }

  return templates.map((template) => {
    const templateVersions = versionsByTemplate.get(template.id) ?? [];
    const activeVersion =
      templateVersions.find(
        (version) => version.activated_at && !version.retired_at,
      ) ?? null;

    return {
      ...template,
      activeVersion,
      versions: templateVersions,
    };
  });
}

export async function getAccessibleClient(clientId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select(
      "id, profile_id, status, started_at, ended_at, created_at, updated_at, profiles(display_name)",
    )
    .eq("id", clientId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function listAccessibleClientHydrationTargets(clientId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_hydration_targets")
    .select("id, client_id, weight_kg, target_ml, resolved_target_ml, method_key, method_configuration_snapshot_set_id, created_by_profile_id, created_at")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

export async function listAccessibleClientLiquidIntakeEvents(
  clientId: string,
  recordedFrom?: string,
) {
  const supabase = await createClient();
  let query = supabase
    .from("client_liquid_intake_events")
    .select("id, client_id, recorded_by_profile_id, amount_ml, liquid_kind, method_configuration_snapshot_set_id, recorded_at")
    .eq("client_id", clientId)
    .order("recorded_at", { ascending: false })
    .order("id", { ascending: false });

  if (recordedFrom) {
    query = query.gte("recorded_at", recordedFrom);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data;
}

export async function listAccessibleClientActivityCheckinEvents(
  clientId: string,
  checkinDate?: string,
) {
  const supabase = await createClient();
  let query = supabase
    .from("client_activity_checkin_events")
    .select("id, client_id, recorded_by_profile_id, checkin_date, did_activity, recorded_at")
    .eq("client_id", clientId)
    .order("checkin_date", { ascending: false })
    .order("recorded_at", { ascending: false })
    .order("id", { ascending: false });

  if (checkinDate) {
    query = query.eq("checkin_date", checkinDate);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data;
}

export async function createCurrentClientActivityCheckinEvent(input: {
  checkinDate: string;
  clientId: string;
  didActivity: boolean;
  recordedByProfileId: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_activity_checkin_events")
    .insert({
      checkin_date: input.checkinDate,
      client_id: input.clientId,
      did_activity: input.didActivity,
      recorded_by_profile_id: input.recordedByProfileId,
    })
    .select("id, client_id, recorded_by_profile_id, checkin_date, did_activity, recorded_at")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function getAccessibleWeeklyFeedbackNotificationPreference(
  clientId: string,
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_notification_preference_versions")
    .select(
      "id, client_id, purpose_key, channel_key, version_number, created_at, activated_at, retired_at",
    )
    .eq("client_id", clientId)
    .eq("purpose_key", "weekly_feedback")
    .is("retired_at", null)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function listAccessibleClientNotificationEvents(clientId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_notification_events")
    .select(
      "id, client_id, weekly_feedback_id, event_key, channel_key, preference_version_id, schedule_configuration_version_id, delivery_state, blocked_reason, delivered_at, created_at",
    )
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

export async function getAccessibleClientRegistration(clientId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_registration")
    .select("client_id, city, phone, contact_email, instagram, created_at, updated_at")
    .eq("client_id", clientId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function listAccessibleClientTrainingRequests(clientId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_training_requests")
    .select(
      "id, client_id, recorded_by_profile_id, requested_at, note, created_at, profiles(display_name)",
    )
    .eq("client_id", clientId)
    .order("requested_at", { ascending: false })
    .order("id", { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

export async function createAccessibleClientTrainingRequest(input: {
  clientId: string;
  note: string | null;
  recordedByProfileId: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_training_requests")
    .insert({
      client_id: input.clientId,
      note: input.note,
      recorded_by_profile_id: input.recordedByProfileId,
    })
    .select("id, client_id, recorded_by_profile_id, requested_at, note, created_at")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function getAccessibleClientTrainingPlan(clientId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_training_plans")
    .select("id, client_id, created_at")
    .eq("client_id", clientId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function listAccessibleClientTrainingPlanVersions(
  trainingPlanId: string,
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_training_plan_versions")
    .select(
      "id, training_plan_id, version_number, title, notes, created_by_profile_id, reviewed_at, reviewed_by_profile_id, published_at, published_by_profile_id, created_at",
    )
    .eq("training_plan_id", trainingPlanId)
    .order("version_number", { ascending: false })
    .order("id", { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

export async function listAccessibleClientTrainingPlanItems(
  trainingPlanVersionId: string,
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_training_plan_items")
    .select(
      "id, training_plan_version_id, position, exercise_version_id, exercise_name, sets_text, repetitions_text, rest_text, execution_notes, created_at",
    )
    .eq("training_plan_version_id", trainingPlanVersionId)
    .order("position", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    throw error;
  }

  return data;
}

export async function createAccessibleClientTrainingPlanDraft(input: {
  clientId: string;
  notes: string | null;
  title: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "create_client_training_plan_draft",
    {
      p_client_id: input.clientId,
      p_notes: input.notes ?? undefined,
      p_title: input.title,
    },
  );

  if (error) {
    throw error;
  }

  return data;
}

export async function updateAccessibleClientTrainingPlanDraft(input: {
  notes: string | null;
  title: string;
  trainingPlanVersionId: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("client_training_plan_versions")
    .update({
      notes: input.notes,
      title: input.title,
    })
    .eq("id", input.trainingPlanVersionId)
    .is("reviewed_at", null)
    .is("published_at", null);

  if (error) {
    throw error;
  }
}

export async function createAccessibleClientTrainingPlanItem(input: {
  executionNotes: string | null;
  exerciseName: string;
  exerciseVersionId: string | null;
  position: number;
  repetitionsText: string;
  restText: string | null;
  setsText: string;
  trainingPlanVersionId: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_training_plan_items")
    .insert({
      execution_notes: input.executionNotes,
      exercise_name: input.exerciseName,
      exercise_version_id: input.exerciseVersionId,
      position: input.position,
      repetitions_text: input.repetitionsText,
      rest_text: input.restText,
      sets_text: input.setsText,
      training_plan_version_id: input.trainingPlanVersionId,
    })
    .select(
      "id, training_plan_version_id, position, exercise_version_id, exercise_name, sets_text, repetitions_text, rest_text, execution_notes, created_at",
    )
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateAccessibleClientTrainingPlanItem(input: {
  executionNotes: string | null;
  exerciseName: string;
  exerciseVersionId: string | null;
  itemId: string;
  position: number;
  repetitionsText: string;
  restText: string | null;
  setsText: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("client_training_plan_items")
    .update({
      execution_notes: input.executionNotes,
      exercise_name: input.exerciseName,
      exercise_version_id: input.exerciseVersionId,
      position: input.position,
      repetitions_text: input.repetitionsText,
      rest_text: input.restText,
      sets_text: input.setsText,
    })
    .eq("id", input.itemId);

  if (error) {
    throw error;
  }
}

export async function deleteAccessibleClientTrainingPlanItem(itemId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("client_training_plan_items")
    .delete()
    .eq("id", itemId);

  if (error) {
    throw error;
  }
}

export async function reviewAccessibleClientTrainingPlanVersion(
  trainingPlanVersionId: string,
) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "review_client_training_plan_version",
    {
      p_training_plan_version_id: trainingPlanVersionId,
    },
  );

  if (error) {
    throw error;
  }

  return data;
}

export async function publishAccessibleClientTrainingPlanVersion(
  trainingPlanVersionId: string,
) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "publish_client_training_plan_version",
    {
      p_training_plan_version_id: trainingPlanVersionId,
    },
  );

  if (error) {
    throw error;
  }

  return data;
}

export async function listAccessibleNonterminalAiExecutions() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_executions")
    .select(
      "id, client_id, purpose_key, anamnesis_submission_id, provider, model_identifier, status, created_at, completed_at, failed_at, clients(id, profiles(display_name))",
    )
    .eq("status", "started")
    .is("completed_at", null)
    .is("failed_at", null)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    throw error;
  }

  return data;
}

export async function listAccessibleAiAnamnesisExecutions(submissionId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_executions")
    .select(
      "id, anamnesis_submission_id, provider, model_identifier, status, prompt_version_id, created_at, completed_at, failed_at, failure_stage, failure_code, failure_message",
    )
    .eq("purpose_key", "anamnesis_review")
    .eq("anamnesis_submission_id", submissionId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

export async function listAccessibleAiExecutionOutputs(executionIds: string[]) {
  if (executionIds.length === 0) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_execution_outputs")
    .select("execution_id, content, created_at")
    .in("execution_id", executionIds);

  if (error) {
    throw error;
  }

  return data;
}

export async function getLatestAccessibleAiPromptVersion(promptKey: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_prompt_versions")
    .select("id, prompt_key, version_number, content, created_at")
    .eq("prompt_key", promptKey)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function listAccessibleAnamnesisSubmissions(clientId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("anamnesis_submissions")
    .select(
      "id, client_id, form_version_id, created_at, submitted_at, anamnesis_form_versions(version_number)",
    )
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

export async function getAccessibleAnamnesisSubmission(submissionId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("anamnesis_submissions")
    .select(
      "id, client_id, form_version_id, created_at, submitted_at, clients(id, profiles(display_name)), anamnesis_form_versions(id, version_number, published_at)",
    )
    .eq("id", submissionId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function listAccessibleAnamnesisSections(formVersionId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("anamnesis_sections")
    .select("id, form_version_id, section_key, title, display_order")
    .eq("form_version_id", formVersionId)
    .order("display_order", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    throw error;
  }

  return data;
}

export async function listAccessibleAnamnesisQuestions(formVersionId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("anamnesis_questions")
    .select(
      "id, form_version_id, section_id, question_key, label, display_order, answer_type, required, options, applicability_source_question_id, applicability_expected_answer",
    )
    .eq("form_version_id", formVersionId)
    .order("display_order", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    throw error;
  }

  return data;
}

export async function listAccessibleAnamnesisAnswers(submissionId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("anamnesis_answers")
    .select(
      "id, submission_id, form_version_id, question_id, answer_value, created_at, updated_at",
    )
    .eq("submission_id", submissionId)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    throw error;
  }

  return data;
}

export async function getAccessibleAnamnesisAnswer(answerId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("anamnesis_answers")
    .select(
      "id, submission_id, form_version_id, question_id, answer_value, created_at, updated_at",
    )
    .eq("id", answerId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function listAccessibleAnamnesisAnswerCorrections(
  answerIds: string[],
) {
  if (answerIds.length === 0) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("anamnesis_answer_corrections")
    .select(
      "id, answer_id, corrected_answer_value, corrected_by_profile_id, created_at, profiles(display_name)",
    )
    .in("answer_id", answerIds)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    throw error;
  }

  return data;
}

export async function createAccessibleAnamnesisAnswerCorrection(input: {
  answerId: string;
  correctedAnswerValue: Json;
  correctedByProfileId: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("anamnesis_answer_corrections")
    .insert({
      answer_id: input.answerId,
      corrected_answer_value: input.correctedAnswerValue,
      corrected_by_profile_id: input.correctedByProfileId,
    });

  if (error) {
    throw error;
  }
}

export async function listAccessibleAnamnesisClarificationRequests(submissionId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("anamnesis_clarification_requests")
    .select("id, submission_id, source_answer_id, requested_by_profile_id, request_text, created_at")
    .eq("submission_id", submissionId)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });
  if (error) throw error;
  return data;
}

export async function getAccessibleAnamnesisClarificationRequest(requestId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("anamnesis_clarification_requests")
    .select("id, submission_id, source_answer_id, requested_by_profile_id, request_text, created_at")
    .eq("id", requestId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listAccessibleAnamnesisClarificationResponses(requestIds: string[]) {
  if (requestIds.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("anamnesis_clarification_responses")
    .select("id, clarification_request_id, responder_profile_id, response_text, created_at")
    .in("clarification_request_id", requestIds)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });
  if (error) throw error;
  return data;
}

export async function listAccessibleAnamnesisClarificationResolutions(
  requestIds: string[],
) {
  if (requestIds.length === 0) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("anamnesis_clarification_resolutions")
    .select("id, clarification_request_id, resolved_by_profile_id, resolved_at")
    .in("clarification_request_id", requestIds)
    .order("resolved_at", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    throw error;
  }

  return data;
}

export async function createAccessibleAnamnesisClarificationResolution(input: {
  clarificationRequestId: string;
  resolvedByProfileId: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("anamnesis_clarification_resolutions")
    .insert({
      clarification_request_id: input.clarificationRequestId,
      resolved_by_profile_id: input.resolvedByProfileId,
    })
    .select("id, clarification_request_id, resolved_by_profile_id, resolved_at")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function createAccessibleAnamnesisClarificationRequest(input: {
  requestText: string;
  requestedByProfileId: string;
  sourceAnswerId: string | null;
  submissionId: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("anamnesis_clarification_requests").insert({
    request_text: input.requestText,
    requested_by_profile_id: input.requestedByProfileId,
    source_answer_id: input.sourceAnswerId,
    submission_id: input.submissionId,
  });
  if (error) throw error;
}

export async function createAccessibleAnamnesisClarificationResponse(input: {
  clarificationRequestId: string;
  responderProfileId: string;
  responseText: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("anamnesis_clarification_responses").insert({
    clarification_request_id: input.clarificationRequestId,
    responder_profile_id: input.responderProfileId,
    response_text: input.responseText,
  });
  if (error) throw error;
}

export async function listAccessibleAnamnesisReviews(submissionId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("anamnesis_reviews")
    .select(
      "id, submission_id, reviewer_profile_id, note, created_at, profiles(display_name)",
    )
    .eq("submission_id", submissionId)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    throw error;
  }

  return data;
}


export async function createAccessibleAnamnesisReview(
  submissionId: string,
  reviewerProfileId: string,
  note: string,
) {
  const supabase = await createClient();
  const { error } = await supabase.from("anamnesis_reviews").insert({
    submission_id: submissionId,
    reviewer_profile_id: reviewerProfileId,
    note,
  });

  if (error) {
    throw error;
  }
}

export async function listEducationalContentVersionsForCurrentAdmin() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("educational_content_versions")
    .select(
      "id, version_number, title, category_key, content_type_key, display_order, published_at",
    )
    .order("display_order", { ascending: true })
    .order("version_number", { ascending: true });

  if (error) {
    throw error;
  }

  return data;
}

async function listContentReleasesForClient(clientId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_content_releases")
    .select(
      "id, released_at, educational_content_versions(id, version_number, title, category_key, content_type_key), client_content_progress(first_opened_at, completed_at)",
    )
    .eq("client_id", clientId)
    .order("released_at", { ascending: true });

  if (error) {
    throw error;
  }

  return data;
}

export async function listCurrentClientContentReleases(clientId: string) {
  return listContentReleasesForClient(clientId);
}

export async function listContentReleasesForAccessibleClient(clientId: string) {
  return listContentReleasesForClient(clientId);
}


export async function createAccessibleClientContentRelease(
  clientId: string,
  educationalContentVersionId: string,
  releasedByProfileId: string,
) {
  const supabase = await createClient();
  const { error } = await supabase.from("client_content_releases").insert({
    client_id: clientId,
    educational_content_version_id: educationalContentVersionId,
    released_by_profile_id: releasedByProfileId,
  });

  if (error) {
    throw error;
  }
}

export async function listAccessibleClientAssessments() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_assessments")
    .select("id, client_id, assessed_at, assessment_kind, method_configuration_snapshot_set_id, created_by_profile_id, finalized_at, finalized_by_profile_id, clients(id, profiles(display_name))")
    .order("assessed_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

export async function getAccessibleClientAssessment(assessmentId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_assessments")
    .select("id, client_id, assessed_at, assessment_kind, method_configuration_snapshot_set_id, created_by_profile_id, finalized_at, finalized_by_profile_id, clients(id, profiles(display_name))")
    .eq("id", assessmentId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function createAccessibleClientAssessment(input: {
  assessedAt: string;
  assessmentKind: "fortnightly" | "monthly";
  clientId: string;
  createdByProfileId: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_assessments")
    .insert({
      assessed_at: input.assessedAt,
      assessment_kind: input.assessmentKind,
      client_id: input.clientId,
      created_by_profile_id: input.createdByProfileId,
    })
    .select(
      "id, client_id, assessed_at, assessment_kind, method_configuration_snapshot_set_id, created_by_profile_id, finalized_at, finalized_by_profile_id",
    )
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateAccessibleClientAssessmentDraft(input: {
  assessedAt: string;
  assessmentId: string;
  assessmentKind: "fortnightly" | "monthly";
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_assessments")
    .update({
      assessed_at: input.assessedAt,
      assessment_kind: input.assessmentKind,
    })
    .eq("id", input.assessmentId)
    .is("finalized_at", null)
    .select(
      "id, client_id, assessed_at, assessment_kind, method_configuration_snapshot_set_id, created_by_profile_id, finalized_at, finalized_by_profile_id",
    )
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function upsertAccessibleAssessmentMeasurement(input: {
  assessmentId: string;
  key: string;
  unit: string;
  value: number;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assessment_measurements")
    .upsert(
      {
        assessment_id: input.assessmentId,
        measurement_key: input.key,
        measurement_value: input.value,
        unit: input.unit,
      },
      {
        onConflict: "assessment_id,measurement_key",
      },
    )
    .select("id, assessment_id, measurement_key, measurement_value, unit")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteAccessibleAssessmentMeasurement(input: {
  assessmentId: string;
  measurementId: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("assessment_measurements")
    .delete()
    .eq("id", input.measurementId)
    .eq("assessment_id", input.assessmentId);

  if (error) {
    throw error;
  }
}

export async function linkAccessibleAssessmentPhoto(input: {
  assessmentId: string;
  clientFileId: string;
  clientId: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("assessment_files").insert({
    assessment_id: input.assessmentId,
    client_file_id: input.clientFileId,
    client_id: input.clientId,
  });

  if (error) {
    throw error;
  }
}

export async function unlinkAccessibleAssessmentPhoto(input: {
  assessmentId: string;
  clientFileId: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("assessment_files")
    .delete()
    .eq("assessment_id", input.assessmentId)
    .eq("client_file_id", input.clientFileId);

  if (error) {
    throw error;
  }
}

export async function listCurrentClientFinalizedAssessmentMeasurements() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "list_current_client_finalized_assessment_measurements",
  );

  if (error) {
    throw error;
  }

  return data;
}

export async function listAccessibleAssessmentsForClient(clientId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_assessments")
    .select("id, client_id, assessed_at, assessment_kind, method_configuration_snapshot_set_id, created_by_profile_id, finalized_at, finalized_by_profile_id")
    .eq("client_id", clientId)
    .order("assessed_at", { ascending: false })
    .order("id", { ascending: true });

  if (error) {
    throw error;
  }

  return data;
}

export async function listAccessibleAssessmentMeasurements(assessmentId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assessment_measurements")
    .select("id, assessment_id, measurement_key, measurement_value, unit")
    .eq("assessment_id", assessmentId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return data;
}


export async function listAccessibleAssessmentPhotoFiles(assessmentId: string) {
  const supabase = await createClient();
  const { data: links, error: linksError } = await supabase
    .from("assessment_files")
    .select("client_file_id")
    .eq("assessment_id", assessmentId);

  if (linksError) {
    throw linksError;
  }

  const fileIds = links.map((link) => link.client_file_id);

  if (fileIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("client_files")
    .select("id, file_kind, original_filename, mime_type, byte_size, created_at")
    .in("id", fileIds)
    .eq("file_kind", "photo")
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    throw error;
  }

  return data;
}


export async function getAccessiblePhotoFileForAdminViewing(fileId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_files")
    .select("id, bucket_id, object_path, file_kind")
    .eq("id", fileId)
    .eq("file_kind", "photo")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}


export async function listCurrentClientFiles(clientId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_files")
    .select(
      "id, client_id, file_kind, original_filename, mime_type, byte_size, created_at, uploaded_by_profile_id, client_visible_at, client_visibility_set_by_profile_id",
    )
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: true });

  if (error) {
    throw error;
  }

  return data;
}


export async function listAccessibleClientFiles(clientId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_files")
    .select(
      "id, client_id, file_kind, original_filename, mime_type, byte_size, created_at, uploaded_by_profile_id, client_visible_at, client_visibility_set_by_profile_id",
    )
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: true });

  if (error) {
    throw error;
  }

  return data;
}

export async function getAccessiblePrivateFileForCurrentClientDownload(
  fileId: string,
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_files")
    .select("id, bucket_id, object_path, original_filename, file_kind")
    .eq("id", fileId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}


export async function getAccessiblePrivateFileForAdminDownload(fileId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_files")
    .select("id, bucket_id, object_path, original_filename, file_kind")
    .eq("id", fileId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function recordClientFileAccessEvent(input: {
  action: "download" | "view";
  actorProfileId: string;
  authorized: boolean;
  fileKind: "document" | "exam" | null;
  requestedFileId: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("client_file_access_events").insert({
    action: input.action,
    actor_profile_id: input.actorProfileId,
    authorized: input.authorized,
    file_kind: input.fileKind,
    requested_file_id: input.requestedFileId,
  });

  if (error) {
    throw error;
  }
}

export async function listAccessibleProfessionalFollowUpsForAssessment(
  assessmentId: string,
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("professional_follow_ups")
    .select(
      "id, assessment_id, difficulty, adherence_perception, patty_observation, professional_decision, decision_reason, recorded_at",
    )
    .eq("assessment_id", assessmentId)
    .order("recorded_at", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    throw error;
  }

  return data;
}


export async function createAccessibleProfessionalFollowUp(input: {
  adherencePerception: string | null;
  assessmentId: string;
  authorProfileId: string;
  clientId: string;
  decisionReason: string;
  difficulty: string | null;
  pattyObservation: string | null;
  professionalDecision: "advance" | "maintain" | "return" | "simplify";
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("professional_follow_ups").insert({
    adherence_perception: input.adherencePerception,
    assessment_id: input.assessmentId,
    author_profile_id: input.authorProfileId,
    client_id: input.clientId,
    decision_reason: input.decisionReason,
    difficulty: input.difficulty,
    patty_observation: input.pattyObservation,
    professional_decision: input.professionalDecision,
  });

  if (error) {
    throw error;
  }
}

export async function listPublishedExerciseVersionsForCurrentClient() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exercise_versions")
    .select("id, exercise_id, version_number, name, published_at, created_at")
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .order("id", { ascending: true });

  if (error) {
    throw error;
  }

  return data;
}

export async function listExerciseVersionsVisibleToCurrentAdmin() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exercise_versions")
    .select("id, exercise_id, version_number, name, published_at, created_at")
    .order("created_at", { ascending: false })
    .order("id", { ascending: true });

  if (error) {
    throw error;
  }

  return data;
}

export async function listAccessibleProtocols() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("protocols")
    .select("id, client_id, protocol_type, created_at, clients(id, profiles(display_name))")
    .order("created_at", { ascending: false })
    .order("id", { ascending: true });

  if (error) {
    throw error;
  }

  return data;
}


export async function listAccessibleProtocolsForClient(clientId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("protocols")
    .select("id, client_id, protocol_type, created_at")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: true });

  if (error) {
    throw error;
  }

  return data;
}

export async function getAccessibleProtocol(protocolId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("protocols")
    .select("id, client_id, protocol_type, created_at, clients(id, profiles(display_name))")
    .eq("id", protocolId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function listAccessibleProtocolVersions(protocolId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("protocol_versions")
    .select(
      "id, protocol_id, client_id, version_number, based_on_version_id, submitted_for_review_at, created_at",
    )
    .eq("protocol_id", protocolId)
    .order("version_number", { ascending: false })
    .order("id", { ascending: true });

  if (error) {
    throw error;
  }

  return data;
}

export async function cloneAccessibleProtocolVersionDraft(
  sourceProtocolVersionId: string,
  planSnapshot: Json | null,
) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("clone_protocol_version_draft", {
    p_plan_snapshot: planSnapshot,
    p_source_protocol_version_id: sourceProtocolVersionId,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function listAccessibleProtocolVersionApprovals(protocolVersionIds: string[]) {
  if (protocolVersionIds.length === 0) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("protocol_version_approvals")
    .select("id, protocol_version_id, approved_by_profile_id, approved_at")
    .in("protocol_version_id", protocolVersionIds)
    .order("protocol_version_id", { ascending: true });

  if (error) {
    throw error;
  }

  return data;
}

export async function listAccessibleProtocolPublications(protocolVersionIds: string[]) {
  if (protocolVersionIds.length === 0) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("protocol_publications")
    .select("id, protocol_version_id, approval_id, published_by_profile_id, published_at")
    .in("protocol_version_id", protocolVersionIds)
    .order("protocol_version_id", { ascending: true });

  if (error) {
    throw error;
  }

  return data;
}


export async function submitAccessibleProtocolVersionForReview(
  protocolVersionId: string,
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("protocol_versions")
    .update({ submitted_for_review_at: new Date().toISOString() })
    .eq("id", protocolVersionId)
    .is("submitted_for_review_at", null)
    .select("id, protocol_id, client_id, submitted_for_review_at")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function createAccessibleProtocolVersionApproval(input: {
  approvedByProfileId: string;
  clientId: string;
  protocolVersionId: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("protocol_version_approvals")
    .insert({
      approved_by_profile_id: input.approvedByProfileId,
      client_id: input.clientId,
      protocol_version_id: input.protocolVersionId,
    })
    .select("id, protocol_version_id, approved_by_profile_id, approved_at")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function createAccessibleProtocolPublication(input: {
  approvalId: string;
  clientId: string;
  protocolVersionId: string;
  publishedByProfileId: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("protocol_publications")
    .insert({
      approval_id: input.approvalId,
      client_id: input.clientId,
      protocol_version_id: input.protocolVersionId,
      published_by_profile_id: input.publishedByProfileId,
    })
    .select(
      "id, protocol_version_id, approval_id, published_by_profile_id, published_at",
    )
    .single();

  if (error) {
    throw error;
  }

  return data;
}


export type AccessibleProtocolVersionMealPlan = {
  cycles: Array<{
    id: string;
    steps: Array<{
      position: number;
      variantId: string;
      variantKey: string;
      variantLabel: string | null;
    }>;
  }>;
  foodEquivalentCatalogVersionId: string | null;
  id: string;
  protocolVersionId: string;
  variants: Array<{
    id: string;
    label: string | null;
    variantKey: string;
    meals: Array<{
      id: string;
      label: string | null;
      position: number;
      doseAllocations: Array<{
        doseQuantity: number;
        doseType: string;
        id: string;
      }>;
    }>;
  }>;
};

export async function listAccessibleProtocolVersionMealPlans(
  protocolVersionIds: string[],
): Promise<AccessibleProtocolVersionMealPlan[]> {
  if (protocolVersionIds.length === 0) {
    return [];
  }

  const supabase = await createClient();
  const { data: plans, error: plansError } = await supabase
    .from("meal_plan_versions")
    .select("id, protocol_version_id, food_equivalent_catalog_version_id")
    .in("protocol_version_id", protocolVersionIds);

  if (plansError) {
    throw plansError;
  }

  const planIds = plans.map((plan) => plan.id);

  if (planIds.length === 0) {
    return [];
  }

  const [
    { data: variants, error: variantsError },
    { data: cycles, error: cyclesError },
  ] = await Promise.all([
    supabase
      .from("meal_plan_variants")
      .select("id, meal_plan_version_id, variant_key, label")
      .in("meal_plan_version_id", planIds)
      .order("variant_key", { ascending: true })
      .order("id", { ascending: true }),
    supabase
      .from("meal_plan_cycles")
      .select("id, meal_plan_version_id")
      .in("meal_plan_version_id", planIds)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true }),
  ]);

  if (variantsError) {
    throw variantsError;
  }

  if (cyclesError) {
    throw cyclesError;
  }

  const variantIds = variants.map((variant) => variant.id);
  const cycleIds = cycles.map((cycle) => cycle.id);

  const [
    { data: meals, error: mealsError },
    { data: cycleSteps, error: cycleStepsError },
  ] = await Promise.all([
    variantIds.length
      ? supabase
          .from("meals")
          .select("id, meal_plan_variant_id, position, label")
          .in("meal_plan_variant_id", variantIds)
          .order("position", { ascending: true })
          .order("id", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    cycleIds.length
      ? supabase
          .from("meal_plan_cycle_steps")
          .select("cycle_id, meal_plan_version_id, variant_id, position")
          .in("cycle_id", cycleIds)
          .order("position", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (mealsError) {
    throw mealsError;
  }

  if (cycleStepsError) {
    throw cycleStepsError;
  }

  const mealIds = meals.map((meal) => meal.id);
  const { data: doseAllocations, error: doseAllocationsError } =
    mealIds.length > 0
      ? await supabase
          .from("meal_dose_allocations")
          .select("id, meal_id, dose_type, dose_quantity")
          .in("meal_id", mealIds)
          .order("dose_type", { ascending: true })
          .order("id", { ascending: true })
      : { data: [], error: null };

  if (doseAllocationsError) {
    throw doseAllocationsError;
  }

  const variantsByPlanId = new Map<string, typeof variants>();
  const mealsByVariantId = new Map<string, typeof meals>();
  const dosesByMealId = new Map<string, typeof doseAllocations>();
  const cyclesByPlanId = new Map<string, typeof cycles>();
  const stepsByCycleId = new Map<string, typeof cycleSteps>();
  const variantsById = new Map(variants.map((variant) => [variant.id, variant]));

  for (const variant of variants) {
    const entries = variantsByPlanId.get(variant.meal_plan_version_id) ?? [];
    entries.push(variant);
    variantsByPlanId.set(variant.meal_plan_version_id, entries);
  }

  for (const meal of meals) {
    const entries = mealsByVariantId.get(meal.meal_plan_variant_id) ?? [];
    entries.push(meal);
    mealsByVariantId.set(meal.meal_plan_variant_id, entries);
  }

  for (const allocation of doseAllocations) {
    const entries = dosesByMealId.get(allocation.meal_id) ?? [];
    entries.push(allocation);
    dosesByMealId.set(allocation.meal_id, entries);
  }

  for (const cycle of cycles) {
    const entries = cyclesByPlanId.get(cycle.meal_plan_version_id) ?? [];
    entries.push(cycle);
    cyclesByPlanId.set(cycle.meal_plan_version_id, entries);
  }

  for (const step of cycleSteps) {
    const entries = stepsByCycleId.get(step.cycle_id) ?? [];
    entries.push(step);
    stepsByCycleId.set(step.cycle_id, entries);
  }

  return plans.map((plan) => ({
    cycles: (cyclesByPlanId.get(plan.id) ?? []).map((cycle) => ({
      id: cycle.id,
      steps: (stepsByCycleId.get(cycle.id) ?? []).flatMap((step) => {
        const variant = variantsById.get(step.variant_id);

        if (!variant) {
          return [];
        }

        return [
          {
            position: step.position,
            variantId: variant.id,
            variantKey: variant.variant_key,
            variantLabel: variant.label,
          },
        ];
      }),
    })),
    foodEquivalentCatalogVersionId: plan.food_equivalent_catalog_version_id,
    id: plan.id,
    protocolVersionId: plan.protocol_version_id,
    variants: (variantsByPlanId.get(plan.id) ?? []).map((variant) => ({
      id: variant.id,
      label: variant.label,
      variantKey: variant.variant_key,
      meals: (mealsByVariantId.get(variant.id) ?? []).map((meal) => ({
        id: meal.id,
        label: meal.label,
        position: meal.position,
        doseAllocations: (dosesByMealId.get(meal.id) ?? []).map(
          (allocation) => ({
            doseQuantity: allocation.dose_quantity,
            doseType: allocation.dose_type,
            id: allocation.id,
          }),
        ),
      })),
    })),
  }));
}

export type CurrentClientPublishedProtocol = {
  id: string;
  protocolType: string;
  publishedAt: string;
  versionNumber: number;
  mealPlan: {
    cycles: Array<{
      id: string;
      steps: Array<{
        position: number;
        variantId: string;
        variantKey: string;
        variantLabel: string | null;
      }>;
    }>;
    variants: Array<{
      id: string;
      label: string | null;
      variantKey: string;
      meals: Array<{
        id: string;
        label: string | null;
        position: number;
        doseAllocations: Array<{
          doseQuantity: number;
          doseType: string;
          id: string;
        }>;
      }>;
    }>;
  } | null;
};

export async function listPublishedProtocolsForCurrentClient(
  clientId: string,
): Promise<CurrentClientPublishedProtocol[]> {
  const supabase = await createClient();
  const { data: publications, error: publicationsError } = await supabase
    .from("protocol_publications")
    .select("id, protocol_version_id, published_at")
    .eq("client_id", clientId)
    .order("published_at", { ascending: false })
    .order("id", { ascending: true });

  if (publicationsError) {
    throw publicationsError;
  }

  const protocolVersionIds = publications.map(
    (publication) => publication.protocol_version_id,
  );

  if (protocolVersionIds.length === 0) {
    return [];
  }

  const { data: versions, error: versionsError } = await supabase
    .from("protocol_versions")
    .select("id, protocol_id, version_number")
    .eq("client_id", clientId)
    .in("id", protocolVersionIds);

  if (versionsError) {
    throw versionsError;
  }

  const protocolIds = versions.map((version) => version.protocol_id);
  const { data: protocols, error: protocolsError } = await supabase
    .from("protocols")
    .select("id, protocol_type")
    .eq("client_id", clientId)
    .in("id", protocolIds);

  if (protocolsError) {
    throw protocolsError;
  }

  const { data: mealPlanVersions, error: mealPlanVersionsError } = await supabase
    .from("meal_plan_versions")
    .select("id, protocol_version_id")
    .eq("client_id", clientId)
    .in("protocol_version_id", protocolVersionIds);

  if (mealPlanVersionsError) {
    throw mealPlanVersionsError;
  }

  const mealPlanVersionIds = mealPlanVersions.map(
    (mealPlanVersion) => mealPlanVersion.id,
  );
  const [
    { data: variants, error: variantsError },
    { data: cycles, error: cyclesError },
  ] = mealPlanVersionIds.length
    ? await Promise.all([
        supabase
          .from("meal_plan_variants")
          .select("id, meal_plan_version_id, variant_key, label")
          .in("meal_plan_version_id", mealPlanVersionIds)
          .order("variant_key", { ascending: true })
          .order("id", { ascending: true }),
        supabase
          .from("meal_plan_cycles")
          .select("id, meal_plan_version_id")
          .in("meal_plan_version_id", mealPlanVersionIds)
          .order("created_at", { ascending: true })
          .order("id", { ascending: true }),
      ])
    : [
        { data: [], error: null },
        { data: [], error: null },
      ];

  if (variantsError) {
    throw variantsError;
  }

  if (cyclesError) {
    throw cyclesError;
  }

  const variantIds = variants.map((variant) => variant.id);
  const { data: meals, error: mealsError } = variantIds.length
    ? await supabase
        .from("meals")
        .select("id, meal_plan_variant_id, position, label")
        .in("meal_plan_variant_id", variantIds)
        .order("position", { ascending: true })
        .order("id", { ascending: true })
    : { data: [], error: null };

  if (mealsError) {
    throw mealsError;
  }

  const mealIds = meals.map((meal) => meal.id);
  const cycleIds = cycles.map((cycle) => cycle.id);
  const [
    { data: doseAllocations, error: doseAllocationsError },
    { data: cycleSteps, error: cycleStepsError },
  ] = await Promise.all([
    mealIds.length
      ? supabase
          .from("meal_dose_allocations")
          .select("id, meal_id, dose_type, dose_quantity")
          .in("meal_id", mealIds)
          .order("dose_type", { ascending: true })
          .order("id", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    cycleIds.length
      ? supabase
          .from("meal_plan_cycle_steps")
          .select("cycle_id, variant_id, position")
          .in("cycle_id", cycleIds)
          .order("position", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (doseAllocationsError) {
    throw doseAllocationsError;
  }

  if (cycleStepsError) {
    throw cycleStepsError;
  }

  const protocolsById = new Map(protocols.map((protocol) => [protocol.id, protocol]));
  const versionsById = new Map(versions.map((version) => [version.id, version]));
  const mealPlansByProtocolVersionId = new Map(
    mealPlanVersions.map((mealPlanVersion) => [
      mealPlanVersion.protocol_version_id,
      mealPlanVersion,
    ]),
  );
  const variantsByMealPlanVersionId = new Map<string, typeof variants>();
  const mealsByVariantId = new Map<string, typeof meals>();
  const dosesByMealId = new Map<string, typeof doseAllocations>();
  const cyclesByMealPlanVersionId = new Map<string, typeof cycles>();
  const stepsByCycleId = new Map<string, typeof cycleSteps>();
  const variantsById = new Map(variants.map((variant) => [variant.id, variant]));

  for (const variant of variants) {
    const entries = variantsByMealPlanVersionId.get(variant.meal_plan_version_id) ?? [];
    entries.push(variant);
    variantsByMealPlanVersionId.set(variant.meal_plan_version_id, entries);
  }

  for (const meal of meals) {
    const entries = mealsByVariantId.get(meal.meal_plan_variant_id) ?? [];
    entries.push(meal);
    mealsByVariantId.set(meal.meal_plan_variant_id, entries);
  }

  for (const doseAllocation of doseAllocations) {
    const entries = dosesByMealId.get(doseAllocation.meal_id) ?? [];
    entries.push(doseAllocation);
    dosesByMealId.set(doseAllocation.meal_id, entries);
  }

  for (const cycle of cycles) {
    const entries =
      cyclesByMealPlanVersionId.get(cycle.meal_plan_version_id) ?? [];
    entries.push(cycle);
    cyclesByMealPlanVersionId.set(cycle.meal_plan_version_id, entries);
  }

  for (const step of cycleSteps) {
    const entries = stepsByCycleId.get(step.cycle_id) ?? [];
    entries.push(step);
    stepsByCycleId.set(step.cycle_id, entries);
  }

  return publications.flatMap((publication) => {
    const version = versionsById.get(publication.protocol_version_id);
    const protocol = version ? protocolsById.get(version.protocol_id) : null;

    if (!version || !protocol) {
      return [];
    }

    const mealPlan = mealPlansByProtocolVersionId.get(version.id);

    return [
      {
        id: publication.id,
        protocolType: protocol.protocol_type,
        publishedAt: publication.published_at,
        versionNumber: version.version_number,
        mealPlan: mealPlan
          ? {
              cycles: (cyclesByMealPlanVersionId.get(mealPlan.id) ?? []).map(
                (cycle) => ({
                  id: cycle.id,
                  steps: (stepsByCycleId.get(cycle.id) ?? []).flatMap((step) => {
                    const variant = variantsById.get(step.variant_id);

                    if (!variant) {
                      return [];
                    }

                    return [
                      {
                        position: step.position,
                        variantId: variant.id,
                        variantKey: variant.variant_key,
                        variantLabel: variant.label,
                      },
                    ];
                  }),
                }),
              ),
              variants: (variantsByMealPlanVersionId.get(mealPlan.id) ?? []).map(
                (variant) => ({
                  id: variant.id,
                  label: variant.label,
                  variantKey: variant.variant_key,
                  meals: (mealsByVariantId.get(variant.id) ?? []).map((meal) => ({
                    id: meal.id,
                    label: meal.label,
                    position: meal.position,
                    doseAllocations: (dosesByMealId.get(meal.id) ?? []).map(
                      (doseAllocation) => ({
                        id: doseAllocation.id,
                        doseType: doseAllocation.dose_type,
                        doseQuantity: doseAllocation.dose_quantity,
                      }),
                    ),
                  })),
                }),
              ),
            }
          : null,
      },
    ];
  });
}


export async function hasAccessibleProtocolPublicationForClient(clientId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("protocol_publications")
    .select("id")
    .eq("client_id", clientId)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data);
}


export async function getLatestPublishedWeeklyFeedbackFormVersion() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("weekly_feedback_form_versions")
    .select("id, version_number, title, definition, published_at, created_at")
    .not("published_at", "is", null)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function listAccessibleWeeklyFeedbacksForClient(clientId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_weekly_feedbacks")
    .select(
      "id, client_id, form_version_id, period_start, period_end, due_at, requested_by_profile_id, request_source, schedule_configuration_version_id, answers, submitted_at, created_at, weekly_feedback_form_versions(id, version_number, title, definition, published_at)",
    )
    .eq("client_id", clientId)
    .order("period_start", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

export async function createAccessibleWeeklyFeedbackRequest(input: {
  clientId: string;
  dueAt: string | null;
  formVersionId: string;
  periodEnd: string;
  periodStart: string;
  requestedByProfileId: string;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_weekly_feedbacks")
    .insert({
      client_id: input.clientId,
      due_at: input.dueAt,
      form_version_id: input.formVersionId,
      period_end: input.periodEnd,
      period_start: input.periodStart,
      requested_by_profile_id: input.requestedByProfileId,
    })
    .select(
      "id, client_id, form_version_id, period_start, period_end, due_at, requested_by_profile_id, request_source, schedule_configuration_version_id, answers, submitted_at, created_at",
    )
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function getCurrentClientWeeklyFeedback(
  clientId: string,
  feedbackId: string,
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_weekly_feedbacks")
    .select(
      "id, client_id, form_version_id, period_start, period_end, due_at, request_source, schedule_configuration_version_id, answers, submitted_at, created_at, weekly_feedback_form_versions(id, version_number, title, definition, published_at)",
    )
    .eq("client_id", clientId)
    .eq("id", feedbackId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateCurrentClientWeeklyFeedback(input: {
  answers: Json;
  clientId: string;
  feedbackId: string;
  submit: boolean;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_weekly_feedbacks")
    .update({
      answers: input.answers,
      submitted_at: input.submit ? new Date().toISOString() : null,
    })
    .eq("id", input.feedbackId)
    .eq("client_id", input.clientId)
    .is("submitted_at", null)
    .select(
      "id, client_id, form_version_id, period_start, period_end, due_at, request_source, schedule_configuration_version_id, answers, submitted_at, created_at",
    )
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}
