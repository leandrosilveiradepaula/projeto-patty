import "server-only";

import { createClient } from "@/lib/supabase/server";

async function getVerifiedProfileId() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error) {
    throw error;
  }

  return typeof data?.claims?.sub === "string" ? data.claims.sub : null;
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
      "id, form_version_id, section_id, question_key, label, display_order, answer_type, required, options",
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

export async function listAccessibleClientAssessments() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_assessments")
    .select("id, client_id, assessed_at, clients(id, profiles(display_name))")
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
    .select("id, client_id, assessed_at, clients(id, profiles(display_name))")
    .eq("id", assessmentId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function listAccessibleAssessmentsForClient(clientId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_assessments")
    .select("id, client_id, assessed_at")
    .eq("client_id", clientId)
    .order("assessed_at", { ascending: false });

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


export async function listAccessibleClientFiles(clientId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_files")
    .select(
      "id, client_id, file_kind, original_filename, mime_type, byte_size, created_at",
    )
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: true });

  if (error) {
    throw error;
  }

  return data;
}

export async function getAccessiblePrivateFileForAdminDownload(fileId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_files")
    .select("id, bucket_id, object_path, original_filename")
    .eq("id", fileId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
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

export type CurrentClientPublishedProtocol = {
  id: string;
  protocolType: string;
  publishedAt: string;
  versionNumber: number;
  mealPlan: {
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

  const mealPlanVersionIds = mealPlanVersions.map((mealPlanVersion) => mealPlanVersion.id);
  const { data: variants, error: variantsError } = mealPlanVersionIds.length
    ? await supabase
        .from("meal_plan_variants")
        .select("id, meal_plan_version_id, variant_key, label")
        .in("meal_plan_version_id", mealPlanVersionIds)
        .order("variant_key", { ascending: true })
        .order("id", { ascending: true })
    : { data: [], error: null };

  if (variantsError) {
    throw variantsError;
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
  const { data: doseAllocations, error: doseAllocationsError } = mealIds.length
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
