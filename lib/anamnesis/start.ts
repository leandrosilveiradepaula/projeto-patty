import "server-only";

import { getCurrentClient } from "@/lib/supabase/data-access";
import { requireRoleIdentity } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

import {
  AnamnesisDraftPersistenceError,
  getOrCreateCurrentClientAnamnesisDraft,
} from "./draft";
import {
  CLIENT_ANAMNESIS_FORM_KEY,
  selectCurrentPublishedAnamnesisVersion,
} from "./start-policy";

export type ClientAnamnesisStartAvailability =
  | {
      available: true;
      formVersionId: string;
      versionNumber: number;
    }
  | {
      available: false;
    };

async function requireCurrentClient() {
  const auth = await requireRoleIdentity("client");
  const client = await getCurrentClient();

  if (!client || client.profile_id !== auth.profileId) {
    throw new AnamnesisDraftPersistenceError("client_not_found");
  }

  return client;
}

export async function getCurrentClientAnamnesisStartAvailability(): Promise<ClientAnamnesisStartAvailability> {
  await requireCurrentClient();

  const supabase = await createClient();
  const { data: form, error: formError } = await supabase
    .from("anamnesis_forms")
    .select("id, form_key")
    .eq("form_key", CLIENT_ANAMNESIS_FORM_KEY)
    .maybeSingle();

  if (formError) {
    throw formError;
  }

  if (!form) {
    return { available: false };
  }

  const { data: versions, error: versionsError } = await supabase
    .from("anamnesis_form_versions")
    .select("id, version_number, published_at")
    .eq("form_id", form.id)
    .order("version_number", { ascending: false });

  if (versionsError) {
    throw versionsError;
  }

  const current = selectCurrentPublishedAnamnesisVersion(versions);

  if (!current) {
    return { available: false };
  }

  return {
    available: true,
    formVersionId: current.id,
    versionNumber: current.version_number,
  };
}

export async function startCurrentClientAnamnesisDraft() {
  const availability = await getCurrentClientAnamnesisStartAvailability();

  if (!availability.available) {
    throw new AnamnesisDraftPersistenceError("form_version_not_available");
  }

  const result = await getOrCreateCurrentClientAnamnesisDraft(
    availability.formVersionId,
  );

  return {
    ...result,
    versionNumber: availability.versionNumber,
  };
}
