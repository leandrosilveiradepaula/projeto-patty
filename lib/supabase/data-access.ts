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
    .select("id, client_id, form_version_id, created_at, submitted_at")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

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
